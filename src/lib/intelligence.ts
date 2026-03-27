import { prisma } from "@/lib/prisma";

export type IntelligenceConfidence = "high" | "medium" | "low";

export type StructuredInsight = {
  title: string;
  summary: string;
  confidence: IntelligenceConfidence;
  evidence: string[];
  whyItMatters: string;
  actions: string[];
  watchNext: string[];
  sourceScope: "ga4" | "gsc" | "cross-source";
  severity: "opportunity" | "risk" | "watch";
};

export type IntelligenceResponse = {
  ok: true;
  coverage: {
    ga4: {
      properties: number;
      rows: number;
    };
    gsc: {
      sites: number;
      rows: number;
    };
  };
  summary: {
    usersLast7: number;
    usersPrev7: number;
    sessionsLast7: number;
    sessionsPrev7: number;
    engagementLast7: number;
    engagementPrev7: number;
    clicksLast7: number;
    clicksPrev7: number;
    impressionsLast7: number;
    impressionsPrev7: number;
    ctrLast7: number;
    ctrPrev7: number;
    positionLast7: number;
    positionPrev7: number;
  };
  executive: {
    headline: string;
    narrative: string;
    confidence: IntelligenceConfidence;
    topActions: string[];
  };
  overviewCards: Array<{
    label: string;
    value: string;
    delta: number | null;
    tone: "neutral" | "positive" | "negative";
  }>;
  crossSourceInsights: StructuredInsight[];
  seoInsights: StructuredInsight[];
  behaviorInsights: StructuredInsight[];
};

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceFromMagnitude(change: number | null): IntelligenceConfidence {
  if (change === null) return "low";
  const abs = Math.abs(change);
  if (abs >= 25) return "high";
  if (abs >= 10) return "medium";
  return "low";
}

function deltaTone(
  value: number | null,
  reverse = false
): "neutral" | "positive" | "negative" {
  if (value === null || Math.abs(value) < 5) return "neutral";
  if (reverse) {
    return value < 0 ? "positive" : "negative";
  }
  return value > 0 ? "positive" : "negative";
}

export async function getWorkspaceIntelligence(
  workspaceId: string
): Promise<IntelligenceResponse> {
  const [ga4Properties, gscSites, ga4Metrics, gscMetrics] = await Promise.all([
    prisma.ga4Property.findMany({
      where: { workspaceId },
      orderBy: { displayName: "asc" }
    }),
    prisma.gscSite.findMany({
      where: { workspaceId },
      orderBy: { siteUrl: "asc" }
    }),
    prisma.ga4DailyMetric.findMany({
      where: { workspaceId },
      orderBy: { date: "asc" }
    }),
    prisma.gscDailyMetric.findMany({
      where: { workspaceId },
      orderBy: { date: "asc" }
    })
  ]);

  const ga4Last14 = ga4Metrics.slice(-14);
  const ga4Prev7 = ga4Last14.slice(0, 7);
  const ga4Last7 = ga4Last14.slice(7, 14);

  const gscLast14 = gscMetrics.slice(-14);
  const gscPrev7 = gscLast14.slice(0, 7);
  const gscLast7 = gscLast14.slice(7, 14);

  const summary = {
    usersLast7: ga4Last7.reduce((sum, row) => sum + row.users, 0),
    usersPrev7: ga4Prev7.reduce((sum, row) => sum + row.users, 0),
    sessionsLast7: ga4Last7.reduce((sum, row) => sum + row.sessions, 0),
    sessionsPrev7: ga4Prev7.reduce((sum, row) => sum + row.sessions, 0),
    engagementLast7: avg(ga4Last7.map((row) => row.engagementRate)),
    engagementPrev7: avg(ga4Prev7.map((row) => row.engagementRate)),
    clicksLast7: gscLast7.reduce((sum, row) => sum + row.clicks, 0),
    clicksPrev7: gscPrev7.reduce((sum, row) => sum + row.clicks, 0),
    impressionsLast7: gscLast7.reduce((sum, row) => sum + row.impressions, 0),
    impressionsPrev7: gscPrev7.reduce((sum, row) => sum + row.impressions, 0),
    ctrLast7: avg(gscLast7.map((row) => row.ctr)),
    ctrPrev7: avg(gscPrev7.map((row) => row.ctr)),
    positionLast7: avg(gscLast7.map((row) => row.position)),
    positionPrev7: avg(gscPrev7.map((row) => row.position))
  };

  const usersDelta = percentChange(summary.usersLast7, summary.usersPrev7);
  const sessionsDelta = percentChange(summary.sessionsLast7, summary.sessionsPrev7);
  const engagementDelta = percentChange(
    summary.engagementLast7,
    summary.engagementPrev7
  );
  const clicksDelta = percentChange(summary.clicksLast7, summary.clicksPrev7);
  const impressionsDelta = percentChange(
    summary.impressionsLast7,
    summary.impressionsPrev7
  );
  const ctrDelta = percentChange(summary.ctrLast7, summary.ctrPrev7);
  const positionDelta = percentChange(
    summary.positionLast7,
    summary.positionPrev7
  );

  const crossSourceInsights: StructuredInsight[] = [];
  const seoInsights: StructuredInsight[] = [];
  const behaviorInsights: StructuredInsight[] = [];

  if (
    impressionsDelta !== null &&
    clicksDelta !== null &&
    usersDelta !== null &&
    impressionsDelta <= -10 &&
    clicksDelta <= -10 &&
    usersDelta <= -10
  ) {
    crossSourceInsights.push({
      title: "Search visibility loss is now affecting acquisition",
      summary:
        "Search demand reaching the site weakened and user acquisition fell in the same comparison window. This is more consistent with a visibility-side problem than a purely on-site experience issue.",
      confidence: confidenceFromMagnitude(
        Math.min(impressionsDelta, clicksDelta, usersDelta)
      ),
      evidence: [
        `Impressions changed ${impressionsDelta.toFixed(1)}%.`,
        `Clicks changed ${clicksDelta.toFixed(1)}%.`,
        `Users changed ${usersDelta.toFixed(1)}%.`
      ],
      whyItMatters:
        "When visibility and acquisition deteriorate together, content performance, rankings, indexing health, or SERP competitiveness usually deserve attention before UX tuning.",
      actions: [
        "Inspect the landing pages and query groups contributing the largest click loss.",
        "Check if any recent content, template, or technical changes line up with the decline window.",
        "Compare branded and non-branded losses to understand whether the issue is broad or isolated."
      ],
      watchNext: [
        "Impressions by top landing page",
        "CTR on high-impression pages",
        "Average position on core query groups"
      ],
      sourceScope: "cross-source",
      severity: "risk"
    });
  }

  if (
    Math.abs(impressionsDelta ?? 0) < 10 &&
    ctrDelta !== null &&
    sessionsDelta !== null &&
    ctrDelta <= -10 &&
    sessionsDelta <= -10
  ) {
    crossSourceInsights.push({
      title: "Demand is relatively stable, but capture quality is slipping",
      summary:
        "The market is still showing up in search at a similar level, but fewer users are choosing the result and fewer sessions are being generated. This points more toward weaker SERP capture than weaker demand.",
      confidence: confidenceFromMagnitude(Math.min(ctrDelta, sessionsDelta)),
      evidence: [
        `Impressions changed ${(impressionsDelta ?? 0).toFixed(1)}%.`,
        `CTR changed ${ctrDelta.toFixed(1)}%.`,
        `Sessions changed ${sessionsDelta.toFixed(1)}%.`
      ],
      whyItMatters:
        "This pattern often means the opportunity is not 'more content' first. It is better result messaging, cleaner intent match, or page-level SERP performance improvement.",
      actions: [
        "Review titles and meta descriptions for high-impression pages with weaker CTR.",
        "Check whether competitors have overtaken the result visually or semantically.",
        "Prioritize pages that still have impressions but are failing to convert attention into clicks."
      ],
      watchNext: [
        "CTR by landing page",
        "Clicks by query cluster",
        "Position movement on top pages"
      ],
      sourceScope: "cross-source",
      severity: "risk"
    });
  }

  if (clicksDelta !== null && clicksDelta > 10) {
    seoInsights.push({
      title: "Search traffic is still creating opportunity",
      summary:
        "Click volume is stronger than the previous comparison window, which means search remains a viable growth lever even if other parts of the experience need refinement.",
      confidence: confidenceFromMagnitude(clicksDelta),
      evidence: [
        `Clicks changed ${clicksDelta.toFixed(1)}%.`,
        `Impressions changed ${impressionsDelta?.toFixed(1) ?? "N/A"}%.`,
        `CTR changed ${ctrDelta?.toFixed(1) ?? "N/A"}%.`
      ],
      whyItMatters:
        "When search clicks are expanding, the system should protect winning pages and avoid introducing friction that wastes improved acquisition.",
      actions: [
        "Identify the pages and query themes driving the gain.",
        "Preserve and extend the content structures that are winning.",
        "Validate whether the gain is branded, non-branded, or page-specific."
      ],
      watchNext: [
        "Click distribution by page",
        "Query mix shift",
        "CTR on growth pages"
      ],
      sourceScope: "gsc",
      severity: "opportunity"
    });
  }

  if (ctrDelta !== null && ctrDelta < -10) {
    seoInsights.push({
      title: "SERP conversion is under pressure",
      summary:
        "Search visibility is not translating into clicks as effectively as before. The system should treat this as a result messaging or intent-capture issue until disproven.",
      confidence: confidenceFromMagnitude(ctrDelta),
      evidence: [
        `CTR changed ${ctrDelta.toFixed(1)}%.`,
        `Impressions changed ${impressionsDelta?.toFixed(1) ?? "N/A"}%.`,
        `Position changed ${positionDelta?.toFixed(1) ?? "N/A"}%.`
      ],
      whyItMatters:
        "A CTR drop wastes existing visibility and can suppress traffic even before rankings materially deteriorate.",
      actions: [
        "Prioritize title and description refreshes for high-impression pages.",
        "Inspect whether ranking has changed enough to explain the CTR drop.",
        "Compare branded and non-branded CTR separately."
      ],
      watchNext: [
        "CTR by landing page",
        "Position by landing page",
        "Click share across top pages"
      ],
      sourceScope: "gsc",
      severity: "watch"
    });
  }

  if (engagementDelta !== null && engagementDelta < -10) {
    behaviorInsights.push({
      title: "Traffic quality or landing experience is weakening",
      summary:
        "Users are arriving, but they are not engaging as strongly as in the previous window. This usually points toward weaker intent match, weaker page quality, or a lower-quality traffic mix.",
      confidence: confidenceFromMagnitude(engagementDelta),
      evidence: [
        `Engagement rate changed ${engagementDelta.toFixed(1)}%.`,
        `Sessions changed ${sessionsDelta?.toFixed(1) ?? "N/A"}%.`,
        `Users changed ${usersDelta?.toFixed(1) ?? "N/A"}%.`
      ],
      whyItMatters:
        "Acquisition gains are less valuable if the incoming traffic is not resonating with the landing experience or progressing through the journey.",
      actions: [
        "Audit the top landing pages receiving recent sessions.",
        "Check whether traffic source mix changed materially.",
        "Review content alignment and page clarity for growth pages."
      ],
      watchNext: [
        "Engagement by landing page",
        "Session quality by source",
        "Top entry pages"
      ],
      sourceScope: "ga4",
      severity: "risk"
    });
  }

  if (usersDelta !== null && usersDelta > 15 && sessionsDelta !== null && sessionsDelta > 15) {
    behaviorInsights.push({
      title: "Acquisition growth is real, but must be protected",
      summary:
        "Users and sessions are expanding together, which indicates genuine inflow growth rather than a narrow measurement anomaly.",
      confidence: confidenceFromMagnitude(Math.min(usersDelta, sessionsDelta)),
      evidence: [
        `Users changed ${usersDelta.toFixed(1)}%.`,
        `Sessions changed ${sessionsDelta.toFixed(1)}%.`,
        `Engagement changed ${engagementDelta?.toFixed(1) ?? "N/A"}%.`
      ],
      whyItMatters:
        "Growth periods are when weak landing pages and weak funnels become easier to detect. Protecting quality now prevents noisy growth from masking waste.",
      actions: [
        "Identify the top sources and pages creating the gain.",
        "Compare engagement quality on the fastest-growing pages.",
        "Document the current growth drivers before making major changes."
      ],
      watchNext: [
        "Users by source",
        "Sessions by landing page",
        "Engagement on growth pages"
      ],
      sourceScope: "ga4",
      severity: "opportunity"
    });
  }

  const allInsights = [...crossSourceInsights, ...seoInsights, ...behaviorInsights];
  const highest = allInsights[0];

  const executive = highest
    ? {
        headline: highest.title,
        narrative: highest.summary,
        confidence: highest.confidence,
        topActions: highest.actions.slice(0, 3)
      }
    : {
        headline: "The workspace has synced data, but strong diagnostic consensus is not yet available.",
        narrative:
          "The current evidence is still better suited to monitoring than to a high-confidence conclusion. Continue syncing and allow the next windows to sharpen the pattern.",
        confidence: "medium" as IntelligenceConfidence,
        topActions: [
          "Continue syncing GA4 and GSC consistently.",
          "Watch the next 7-day comparison window.",
          "Prioritize pages and properties with enough activity to support confident reasoning."
        ]
      };

  const overviewCards = [
    {
      label: "Users",
      value: String(summary.usersLast7),
      delta: usersDelta,
      tone: deltaTone(usersDelta)
    },
    {
      label: "Sessions",
      value: String(summary.sessionsLast7),
      delta: sessionsDelta,
      tone: deltaTone(sessionsDelta)
    },
    {
      label: "Engagement",
      value: summary.engagementLast7.toFixed(3),
      delta: engagementDelta,
      tone: deltaTone(engagementDelta)
    },
    {
      label: "Search Clicks",
      value: String(summary.clicksLast7),
      delta: clicksDelta,
      tone: deltaTone(clicksDelta)
    }
  ];

  return {
    ok: true,
    coverage: {
      ga4: {
        properties: ga4Properties.length,
        rows: ga4Metrics.length
      },
      gsc: {
        sites: gscSites.length,
        rows: gscMetrics.length
      }
    },
    summary,
    executive,
    overviewCards,
    crossSourceInsights,
    seoInsights,
    behaviorInsights
  };
}

export async function getProjectIntelligence(projectIdOrWorkspaceId: string) {
  return getWorkspaceIntelligence(projectIdOrWorkspaceId);
}