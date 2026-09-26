/**
 * Anitrya intelligence v2: SQL aggregates → detectors → ranked findings.
 * Output keeps the existing IntelligenceRunOutput contract, so the
 * Intelligence page, sync route and sheet exports keep working unchanged.
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  IntelligenceInsight,
  IntelligenceRecommendation,
  IntelligenceRunInput,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";
import { loadEvidenceAggregates } from "@/lib/intelligence/v2/evidence-queries";
import { DETECTORS, type DetectorContext, type Finding } from "@/lib/intelligence/v2/detectors";

export const ENGINE_VERSION = "v2.0";

const GENERIC = new Set(["the", "and", "services", "service", "company", "group", "inc", "llc", "ltd", "project", "site", "web", "online", "www", "com", "net", "org", "pro", "app"]);

// Convert impact to a common "value" scale so different units can be ranked together.
const UNIT_WEIGHT: Record<Finding["unit"], number> = {
  conversions: 30,
  clicks: 1,
  sessions: 0.7,
  "engaged sessions": 0.5,
  impressions: 0.02,
};
const SEVERITY_BONUS = { high: 25, medium: 10, low: 0 } as const;

function makeId(prefix: string, value: string) {
  return `${prefix}_${crypto.createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

export function brandContext(label: string, siteUrl: string | null): Pick<DetectorContext, "brandTokens" | "hostCore"> {
  const brandTokens = label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !GENERIC.has(token));
  let hostCore: string | null = null;
  if (siteUrl) {
    const host = siteUrl.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    hostCore = host.split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || null;
  }
  return { brandTokens, hostCore };
}

export function scoreFinding(finding: Finding) {
  const value = finding.impact * UNIT_WEIGHT[finding.unit];
  const score = 22 * Math.log10(1 + value) * finding.confidence + SEVERITY_BONUS[finding.severity];
  return Math.max(1, Math.min(100, Math.round(score)));
}

export async function runIntelligenceV2(input: IntelligenceRunInput): Promise<IntelligenceRunOutput> {
  const [agg, project] = await Promise.all([
    loadEvidenceAggregates(input),
    prisma.project
      .findFirst({
        where: { workspaceId: input.workspaceId, slug: input.projectSlug },
        select: { name: true, gscSite: { select: { siteUrl: true } } },
      })
      .catch(() => null),
  ]);

  const ctx: DetectorContext = {
    agg,
    ...brandContext(project?.name ?? input.projectLabel, project?.gscSite?.siteUrl ?? null),
  };

  const findings: Finding[] = [];
  for (const detect of DETECTORS) {
    try {
      const finding = detect(ctx);
      if (finding) findings.push(finding);
    } catch (error) {
      console.warn("INTEL_V2_DETECTOR_FAILED", detect.name, error instanceof Error ? error.message : error);
    }
  }

  const generatedAt = new Date().toISOString();
  const runKey = `${input.workspaceId}__${input.projectId}__${input.from}__${input.to}`;
  const hasData = agg.coverage.ga4CurDays > 0 || agg.coverage.gscCurDays > 0;

  if (!hasData) {
    findings.push({
      key: "data_gap",
      category: "data_gap",
      title: "No synced evidence for this range yet",
      finding: "Neither GA4 nor Search Console has stored rows for the selected dates.",
      rationale: "Findings need at least one synced source.",
      action: "Run a sync from Settings for this range.",
      expectedOutcome: "Findings appear as soon as the first sync lands.",
      impact: 0,
      unit: "sessions",
      confidence: 1,
      severity: "high",
      table: "ga4_source_daily",
    });
  }

  const ranked = findings
    .map((finding) => ({ finding, score: finding.category === "data_gap" ? 100 : scoreFinding(finding) }))
    .sort((a, b) => b.score - a.score);

  const insights: IntelligenceInsight[] = [];
  const recommendations: IntelligenceRecommendation[] = [];

  ranked.forEach(({ finding, score }, index) => {
    const insightId = makeId("insight", `${runKey}:${finding.key}`);
    const priority: 1 | 2 | 3 = score >= 70 ? 1 : score >= 40 ? 2 : 3;
    const clicks = finding.unit === "clicks" ? Math.round(finding.impact) : 0;
    const evidenceSummary = finding.rows?.length
      ? finding.rows.slice(0, 3).map((row) => `${row.label}: ${row.values.join(", ")}`).join(" | ")
      : finding.finding;
    const evidence = [
      {
        table: finding.table,
        from: input.from,
        to: input.to,
        metrics: (finding.comparison
          ? { current: finding.comparison.current, previous: finding.comparison.previous }
          : { impact: Math.round(finding.impact) }) as Record<string, number>,
      },
    ];
    insights.push({
      insightId,
      runKey,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      projectSlug: input.projectSlug,
      projectLabel: input.projectLabel,
      analysisWindowFrom: input.from,
      analysisWindowTo: input.to,
      category: finding.category,
      severity: finding.severity,
      hypothesisRank: index + 1,
      priorityScore: score,
      impactEstimatedClicks: clicks,
      evidenceSummary,
      missingDataReason: "",
      title: finding.title,
      finding: finding.finding,
      rationale: finding.rationale,
      evidence,
      recommendedAction: finding.action,
      dataSufficiency: finding.confidence >= 0.6 ? "sufficient" : finding.confidence >= 0.3 ? "partial" : "insufficient",
      missingData: [],
      modelProvider: "anitrya_engine",
      modelVersion: ENGINE_VERSION,
      generatedAt,
      impactValue: Math.round(finding.impact),
      impactUnit: finding.unit,
      confidence: Math.round(finding.confidence * 100) / 100,
      comparison: finding.comparison,
      rows: finding.rows,
      rowHeaders: finding.rowHeaders,
    });
    recommendations.push({
      recommendationId: makeId("rec", `${insightId}:1`),
      runKey,
      insightId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      projectSlug: input.projectSlug,
      priority,
      priorityScore: score,
      title: finding.title,
      action: finding.action,
      expectedOutcome: finding.expectedOutcome,
      evidenceSummary,
      impactEstimatedClicks: clicks,
      evidence,
      generatedAt,
    });
  });

  return { insights, recommendations };
}
