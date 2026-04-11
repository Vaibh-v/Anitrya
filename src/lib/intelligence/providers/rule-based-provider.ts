import crypto from "node:crypto";
import type {
  IntelligenceInsight,
  IntelligenceRecommendation,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";
import type {
  IntelligenceProvider,
  IntelligenceProviderContext,
} from "@/lib/intelligence/provider-interface";
import type {
  GscQueryDailyRow,
  Ga4SourceDailyRow,
} from "@/lib/intelligence/project-evidence";

function makeId(prefix: string, value: string) {
  return `${prefix}_${crypto
    .createHash("sha1")
    .update(value)
    .digest("hex")
    .slice(0, 12)}`;
}

function buildRunKey(input: IntelligenceProviderContext["input"]) {
  return `${input.workspaceId}__${input.projectId}__${input.from}__${input.to}`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function round(value: number, digits = 2) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function priorityFromScore(score: number): 1 | 2 | 3 {
  if (score >= 75) return 1;
  if (score >= 45) return 2;
  return 3;
}

function isoDaysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const diff = Math.max(0, end - start);
  return Math.floor(diff / 86400000) + 1;
}

function formatPercent(value: number) {
  return `${round(value * 100, 2)}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function summarizeTopQueries(topQueries: GscQueryDailyRow[]) {
  return topQueries
    .slice(0, 3)
    .map(
      (row) =>
        `${row.query} → ${formatNumber(row.impressions)} impressions, ${formatPercent(
          row.ctr,
        )} CTR, avg position ${round(row.position, 1)}`,
    )
    .join(" | ");
}

function buildQueryEvidenceSummary(args: {
  topQueries: GscQueryDailyRow[];
  totalImpressions: number;
  weightedCtr: number;
  targetCtr: number;
  impactEstimatedClicks: number;
}) {
  const {
    topQueries,
    totalImpressions,
    weightedCtr,
    targetCtr,
    impactEstimatedClicks,
  } = args;

  return [
    `Top queries: ${summarizeTopQueries(topQueries)}`,
    `Total: ${formatNumber(totalImpressions)} impressions`,
    `Current CTR: ${formatPercent(weightedCtr)}`,
    `Target CTR: ${formatPercent(targetCtr)}`,
    `Estimated upside: ${formatNumber(impactEstimatedClicks)} additional clicks`,
  ].join(" | ");
}

function buildRecommendationSteps(topQueries: GscQueryDailyRow[]) {
  const queryNames = topQueries
    .slice(0, 3)
    .map((row) => row.query)
    .filter(Boolean);

  if (queryNames.length === 0) {
    return "Review high-impression queries, improve title/meta alignment, and tighten landing-page intent match.";
  }

  return [
    `Review title and meta description for: ${queryNames.join(", ")}.`,
    "Confirm each query resolves to the correct landing page.",
    "Strengthen on-page relevance for the target intent.",
    "Re-run the analysis after the next sync window to measure CTR lift.",
  ].join(" ");
}

function buildQueryOpportunityInsight(args: {
  input: IntelligenceProviderContext["input"];
  generatedAt: string;
  topQueries: GscQueryDailyRow[];
}): {
  insight: IntelligenceInsight;
  recommendation: IntelligenceRecommendation;
} {
  const { input, generatedAt, topQueries } = args;

  const runKey = buildRunKey(input);
  const totalImpressions = sum(topQueries.map((row) => row.impressions));
  const totalClicks = sum(topQueries.map((row) => row.clicks));
  const weightedCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const targetCtr = 0.025;
  const impactEstimatedClicks = Math.max(
    0,
    Math.round(totalImpressions * Math.max(0, targetCtr - weightedCtr)),
  );
  const avgPosition = average(topQueries.map((row) => row.position));
  const lowCtrPercent = round(weightedCtr * 100, 2);
  const targetCtrPercent = round(targetCtr * 100, 2);

  const impressionScore = clamp(totalImpressions / 200, 0, 40);
  const ctrGapScore = clamp((targetCtr - weightedCtr) * 2000, 0, 35);
  const positionScore =
    avgPosition >= 3 && avgPosition <= 20 ? 20 : avgPosition < 3 ? 8 : 12;
  const priorityScore = clamp(
    round(impressionScore + ctrGapScore + positionScore, 1),
    0,
    100,
  );
  const priority = priorityFromScore(priorityScore);

  const evidenceSummary = buildQueryEvidenceSummary({
    topQueries,
    totalImpressions,
    weightedCtr,
    targetCtr,
    impactEstimatedClicks,
  });

  const recommendationSteps = buildRecommendationSteps(topQueries);

  const insightId = makeId(
    "insight",
    `${runKey}:query_opportunity:${topQueries.map((row) => row.query).join("|")}`,
  );

  const insight: IntelligenceInsight = {
    insightId,
    runKey,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectLabel: input.projectLabel,
    analysisWindowFrom: input.from,
    analysisWindowTo: input.to,
    category: "query_opportunity",
    severity: priority === 1 ? "high" : "medium",
    hypothesisRank: 1,
    priorityScore,
    impactEstimatedClicks,
    evidenceSummary,
    missingDataReason: "",
    title: `${topQueries.length} high-impression queries are underperforming on CTR`,
    finding: `Across ${topQueries.length} queries, the project generated ${formatNumber(
      totalImpressions,
    )} impressions but only ${formatNumber(
      totalClicks,
    )} clicks, producing a ${lowCtrPercent}% CTR. At a ${targetCtrPercent}% target CTR, this window could have produced about ${formatNumber(
      impactEstimatedClicks,
    )} more clicks.`,
    rationale: `These queries already have visibility, so the bottleneck is more likely weak SERP packaging, weak intent alignment, or insufficient page specificity than lack of visibility. Average position is ${round(
      avgPosition,
      1,
    )}, which means some lift may be possible before needing a major rankings gain.`,
    evidence: topQueries.slice(0, 3).map((row) => ({
      table: "gsc_query_daily" as const,
      from: input.from,
      to: input.to,
      filters: { query: row.query },
      metrics: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    })),
    recommendedAction: recommendationSteps,
    dataSufficiency: "sufficient",
    missingData: [],
    modelProvider: "rule_based",
    modelVersion: "v3",
    generatedAt,
  };

  const recommendation: IntelligenceRecommendation = {
    recommendationId: makeId("rec", `${insightId}:1`),
    runKey,
    insightId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    priority,
    priorityScore,
    title: "Improve low-CTR, high-impression queries",
    action: recommendationSteps,
    expectedOutcome: `Recover part of the estimated ${formatNumber(
      impactEstimatedClicks,
    )} click opportunity from already-visible queries.`,
    evidenceSummary,
    impactEstimatedClicks,
    evidence: insight.evidence,
    generatedAt,
  };

  return { insight, recommendation };
}

function buildSourceConcentrationInsight(args: {
  input: IntelligenceProviderContext["input"];
  generatedAt: string;
  totalGa4Sessions: number;
  topSource: [string, number];
}): {
  insight: IntelligenceInsight;
  recommendation: IntelligenceRecommendation;
} {
  const { input, generatedAt, totalGa4Sessions, topSource } = args;

  const runKey = buildRunKey(input);
  const concentrationRatio =
    totalGa4Sessions > 0 ? topSource[1] / totalGa4Sessions : 0;
  const concentrationPercent = round(concentrationRatio * 100, 1);

  const concentrationScore = clamp((concentrationRatio - 0.5) * 100, 0, 35);
  const volumeScore = clamp(totalGa4Sessions / 150, 0, 35);
  const dependencyScore = topSource[0].toLowerCase().includes("google") ? 20 : 12;
  const priorityScore = clamp(
    round(concentrationScore + volumeScore + dependencyScore, 1),
    0,
    100,
  );
  const priority = priorityFromScore(priorityScore);

  const evidenceSummary = `${topSource[0]} drove ${formatNumber(
    topSource[1],
  )} of ${formatNumber(totalGa4Sessions)} sessions (${concentrationPercent}%) in the selected window.`;

  const insightId = makeId(
    "insight",
    `${runKey}:source_concentration:${topSource[0]}`,
  );

  const insight: IntelligenceInsight = {
    insightId,
    runKey,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectLabel: input.projectLabel,
    analysisWindowFrom: input.from,
    analysisWindowTo: input.to,
    category: "source_concentration",
    severity: priority === 1 ? "high" : "medium",
    hypothesisRank: 2,
    priorityScore,
    impactEstimatedClicks: 0,
    evidenceSummary,
    missingDataReason: "",
    title: `Traffic is concentrated in ${topSource[0]}`,
    finding: `${topSource[0]} contributed ${concentrationPercent}% of all tracked sessions (${formatNumber(
      topSource[1],
    )} of ${formatNumber(totalGa4Sessions)}) during this window.`,
    rationale:
      "High concentration increases channel dependency risk. Even if the source is healthy, a single-channel traffic mix is less resilient to ranking, referral, or platform shifts.",
    evidence: [
      {
        table: "ga4_source_daily",
        from: input.from,
        to: input.to,
        filters: { source: topSource[0] },
        metrics: {
          sessions: topSource[1],
          total_sessions: totalGa4Sessions,
          concentration_ratio: round(concentrationRatio, 4),
        },
      },
    ],
    recommendedAction:
      `Audit why ${topSource[0]} dominates the mix, then identify the next two source groups to grow so dependency falls over time.`,
    dataSufficiency: "sufficient",
    missingData: [],
    modelProvider: "rule_based",
    modelVersion: "v3",
    generatedAt,
  };

  const recommendation: IntelligenceRecommendation = {
    recommendationId: makeId("rec", `${insightId}:1`),
    runKey,
    insightId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    priority,
    priorityScore,
    title: "Reduce acquisition concentration risk",
    action:
      `Build a diversification plan so ${topSource[0]} contributes a smaller share of total sessions over time.`,
    expectedOutcome:
      "A more resilient traffic mix with lower dependency on a single source.",
    evidenceSummary,
    impactEstimatedClicks: 0,
    evidence: insight.evidence,
    generatedAt,
  };

  return { insight, recommendation };
}

function buildDataGapInsight(args: {
  input: IntelligenceProviderContext["input"];
  generatedAt: string;
  missingDataReason: string;
  missingTables: string[];
}): {
  insight: IntelligenceInsight;
  recommendation: IntelligenceRecommendation;
} {
  const { input, generatedAt, missingDataReason, missingTables } = args;

  const runKey = buildRunKey(input);
  const insightId = makeId("insight", `${runKey}:data_gap`);

  const insight: IntelligenceInsight = {
    insightId,
    runKey,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectLabel: input.projectLabel,
    analysisWindowFrom: input.from,
    analysisWindowTo: input.to,
    category: "data_gap",
    severity: "high",
    hypothesisRank: 1,
    priorityScore: 100,
    impactEstimatedClicks: 0,
    evidenceSummary:
      "No usable normalized evidence was available for the requested analysis window.",
    missingDataReason,
    title: "Insufficient evidence for reliable intelligence",
    finding:
      "The selected analysis window does not contain enough normalized evidence to produce a trustworthy ranked insight.",
    rationale:
      "Without sufficient GA4 or GSC evidence, the system should avoid pretending certainty and should direct the user toward restoring evidence quality first.",
    evidence: [],
    recommendedAction:
      "Run or widen project-scoped sync for the selected date range, then re-run intelligence after the normalized evidence tables populate.",
    dataSufficiency: "insufficient",
    missingData: missingTables,
    modelProvider: "rule_based",
    modelVersion: "v3",
    generatedAt,
  };

  const recommendation: IntelligenceRecommendation = {
    recommendationId: makeId("rec", `${insightId}:1`),
    runKey,
    insightId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    priority: 1,
    priorityScore: 100,
    title: "Restore evidence completeness",
    action:
      "Complete sync coverage for the missing normalized tables and re-run the analysis.",
    expectedOutcome:
      "The system will have enough normalized evidence to generate ranked hypotheses and actions.",
    evidenceSummary: insight.evidenceSummary,
    impactEstimatedClicks: 0,
    evidence: [],
    generatedAt,
  };

  return { insight, recommendation };
}

export class RuleBasedIntelligenceProvider implements IntelligenceProvider {
  readonly name = "rule_based" as const;
  readonly modelVersion = "v3";

  async generate(
    context: IntelligenceProviderContext,
  ): Promise<IntelligenceRunOutput> {
    const { input, evidence } = context;
    const generatedAt = new Date().toISOString();

    const insights: IntelligenceInsight[] = [];
    const recommendations: IntelligenceRecommendation[] = [];

    const daysInWindow = isoDaysBetween(input.from, input.to);
    const totalGa4Sessions = sum(
      evidence.ga4SourceDaily.map((row: Ga4SourceDailyRow) => row.sessions),
    );
    const totalGscImpressions = sum(
      evidence.gscQueryDaily.map((row: GscQueryDailyRow) => row.impressions),
    );

    const missingTables: string[] = [];
    if (evidence.ga4SourceDaily.length === 0) missingTables.push("ga4_source_daily");
    if (evidence.ga4LandingPageDaily.length === 0) {
      missingTables.push("ga4_landing_page_daily");
    }
    if (evidence.gscQueryDaily.length === 0) missingTables.push("gsc_query_daily");
    if (evidence.gscPageDaily.length === 0) missingTables.push("gsc_page_daily");

    const hasNoEvidence =
      evidence.ga4SourceDaily.length === 0 &&
      evidence.ga4LandingPageDaily.length === 0 &&
      evidence.gscQueryDaily.length === 0 &&
      evidence.gscPageDaily.length === 0;

    const hasThinEvidence =
      daysInWindow < 14 || totalGscImpressions < 500 || totalGa4Sessions < 200;

    if (hasNoEvidence) {
      const result = buildDataGapInsight({
        input,
        generatedAt,
        missingDataReason:
          "No normalized GA4 or GSC evidence was available for the selected date range.",
        missingTables,
      });

      return {
        insights: [result.insight],
        recommendations: [result.recommendation],
      };
    }

    if (hasThinEvidence) {
      const result = buildDataGapInsight({
        input,
        generatedAt,
        missingDataReason: `Evidence is too thin for strong prioritization. Window=${daysInWindow} day(s), impressions=${formatNumber(
          totalGscImpressions,
        )}, sessions=${formatNumber(totalGa4Sessions)}.`,
        missingTables,
      });
      insights.push(result.insight);
      recommendations.push(result.recommendation);
    }

    const topQueries = [...evidence.gscQueryDaily]
      .filter(
        (row: GscQueryDailyRow) => row.impressions >= 100 && row.ctr <= 0.03,
      )
      .sort(
        (a: GscQueryDailyRow, b: GscQueryDailyRow) =>
          b.impressions - a.impressions,
      )
      .slice(0, 5);

    if (topQueries.length > 0) {
      const result = buildQueryOpportunityInsight({
        input,
        generatedAt,
        topQueries,
      });
      insights.push(result.insight);
      recommendations.push(result.recommendation);
    }

    const sourceTotals = new Map<string, number>();
    for (const row of evidence.ga4SourceDaily) {
      const source = row.source || "(not set)";
      sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + row.sessions);
    }

    const sortedSources = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topSource = sortedSources[0];

    if (
      topSource &&
      totalGa4Sessions > 0 &&
      topSource[1] / totalGa4Sessions >= 0.6
    ) {
      const result = buildSourceConcentrationInsight({
        input,
        generatedAt,
        totalGa4Sessions,
        topSource,
      });
      insights.push(result.insight);
      recommendations.push(result.recommendation);
    }

    if (insights.length === 0) {
      const runKey = buildRunKey(input);
      const insightId = makeId("insight", `${runKey}:other`);

      insights.push({
        insightId,
        runKey,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        projectSlug: input.projectSlug,
        projectLabel: input.projectLabel,
        analysisWindowFrom: input.from,
        analysisWindowTo: input.to,
        category: "other",
        severity: "low",
        hypothesisRank: 1,
        priorityScore: 20,
        impactEstimatedClicks: 0,
        evidenceSummary: `The selected window contains ${formatNumber(
          totalGa4Sessions,
        )} sessions and ${formatNumber(
          totalGscImpressions,
        )} impressions, but no rule-based anomaly crossed the current thresholds.`,
        missingDataReason: "",
        title: "No high-confidence rule-based anomaly detected",
        finding:
          "The current deterministic checks did not surface a strong issue under the configured thresholds.",
        rationale:
          "This does not mean the project has no opportunity. It means the current rule set did not find a high-confidence issue worth prioritizing first.",
        evidence:
          totalGscImpressions > 0
            ? [
                {
                  table: "gsc_query_daily",
                  from: input.from,
                  to: input.to,
                  metrics: { impressions: totalGscImpressions },
                },
              ]
            : [
                {
                  table: "ga4_source_daily",
                  from: input.from,
                  to: input.to,
                  metrics: { sessions: totalGa4Sessions },
                },
              ],
        recommendedAction:
          "Expand the analysis with comparison windows or additional rule types before escalating to model-assisted interpretation.",
        dataSufficiency: hasThinEvidence ? "partial" : "sufficient",
        missingData: missingTables,
        modelProvider: this.name,
        modelVersion: this.modelVersion,
        generatedAt,
      });
    }

    insights.sort(
      (a, b) =>
        b.priorityScore - a.priorityScore || a.hypothesisRank - b.hypothesisRank,
    );
    recommendations.sort(
      (a, b) => b.priorityScore - a.priorityScore || a.priority - b.priority,
    );

    const rankedInsights = insights.map((insight, index) => ({
      ...insight,
      hypothesisRank: index + 1,
    }));

    const recommendationInsightRanks = new Map(
      rankedInsights.map((insight) => [insight.insightId, insight.hypothesisRank]),
    );

    const rankedRecommendations = recommendations.sort((a, b) => {
      const rankA = recommendationInsightRanks.get(a.insightId) ?? 999;
      const rankB = recommendationInsightRanks.get(b.insightId) ?? 999;
      return rankA - rankB || b.priorityScore - a.priorityScore;
    });

    return {
      insights: rankedInsights,
      recommendations: rankedRecommendations,
    };
  }
}