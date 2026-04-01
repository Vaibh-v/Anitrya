import type {
  IntelligenceFinding,
  ProjectDiagnostics,
} from "@/lib/evidence/types";

export type OwnerSheetInsightRow = {
  workspace_id: string;
  created_at: string;
  insight_id: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  category: "seo" | "paid" | "local" | "behavior" | "technical" | "revenue";
  evidence_json: string;
};

export type OwnerSheetRecommendationRow = {
  workspace_id: string;
  created_at: string;
  recommendation_id: string;
  title: string;
  why_it_matters: string;
  steps_json: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  evidence_json: string;
  owner: "marketing" | "seo" | "dev" | "ops" | "sales";
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeEvidence(evidence: string[]) {
  return evidence.map((item, index) => ({
    index: index + 1,
    note: item,
  }));
}

function categoryToInsightCategory(
  category: "overview" | "seo" | "behavior" | "crossSource"
): "seo" | "paid" | "local" | "behavior" | "technical" | "revenue" {
  if (category === "seo") return "seo";
  if (category === "behavior") return "behavior";
  if (category === "crossSource") return "revenue";
  return "revenue";
}

function categoryToOwner(
  category: "overview" | "seo" | "behavior" | "crossSource"
): "marketing" | "seo" | "dev" | "ops" | "sales" {
  if (category === "seo") return "seo";
  if (category === "behavior") return "marketing";
  if (category === "crossSource") return "marketing";
  return "ops";
}

function categoryToEffort(
  category: "overview" | "seo" | "behavior" | "crossSource"
): "low" | "medium" | "high" {
  if (category === "overview") return "low";
  return "medium";
}

function makeInsightId(input: {
  workspaceId: string;
  category: string;
  title: string;
  createdAt: string;
}) {
  return [
    input.workspaceId,
    input.category,
    slugify(input.title),
    input.createdAt.slice(0, 10),
  ].join("_");
}

function makeRecommendationId(input: {
  workspaceId: string;
  category: string;
  title: string;
  action: string;
  createdAt: string;
}) {
  return [
    input.workspaceId,
    input.category,
    slugify(input.title),
    slugify(input.action),
    input.createdAt.slice(0, 10),
  ].join("_");
}

function sectionRows(input: {
  workspaceId: string;
  createdAt: string;
  category: "overview" | "seo" | "behavior" | "crossSource";
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  nextSteps: string[];
}) {
  const insight: OwnerSheetInsightRow = {
    workspace_id: input.workspaceId,
    created_at: input.createdAt,
    insight_id: makeInsightId({
      workspaceId: input.workspaceId,
      category: input.category,
      title: input.title,
      createdAt: input.createdAt,
    }),
    title: input.title,
    summary: input.summary,
    severity: input.confidence,
    category: categoryToInsightCategory(input.category),
    evidence_json: JSON.stringify(normalizeEvidence(input.evidence)),
  };

  const recommendations: OwnerSheetRecommendationRow[] = input.nextSteps.map(
    (step, index) => ({
      workspace_id: input.workspaceId,
      created_at: input.createdAt,
      recommendation_id: makeRecommendationId({
        workspaceId: input.workspaceId,
        category: input.category,
        title: input.title,
        action: `${index + 1}-${step}`,
        createdAt: input.createdAt,
      }),
      title: `${input.title} — action ${index + 1}`,
      why_it_matters: input.summary,
      steps_json: JSON.stringify([step]),
      impact: input.confidence,
      effort: categoryToEffort(input.category),
      evidence_json: JSON.stringify(normalizeEvidence(input.evidence)),
      owner: categoryToOwner(input.category),
    })
  );

  return { insight, recommendations };
}

export function buildOwnerMemoryRows(input: {
  workspaceId: string;
  diagnostics: ProjectDiagnostics;
  createdAt?: string;
}): {
  insights: OwnerSheetInsightRow[];
  recommendations: OwnerSheetRecommendationRow[];
} {
  const createdAt = input.createdAt ?? new Date().toISOString();

  const insights: OwnerSheetInsightRow[] = [];
  const recommendations: OwnerSheetRecommendationRow[] = [];

  const sections: Array<{
    category: "overview" | "seo" | "behavior" | "crossSource";
    title: string;
    summary: string;
    confidence: "low" | "medium" | "high";
    actions: string[];
  }> = [
    {
      category: "overview",
      title: input.diagnostics.overview.title,
      summary: input.diagnostics.overview.summary,
      confidence: input.diagnostics.overview.confidence,
      actions: input.diagnostics.overview.actions,
    },
    {
      category: "seo",
      title: input.diagnostics.seo.title,
      summary: input.diagnostics.seo.summary,
      confidence: input.diagnostics.seo.confidence,
      actions: input.diagnostics.seo.actions,
    },
    {
      category: "behavior",
      title: input.diagnostics.behavior.title,
      summary: input.diagnostics.behavior.summary,
      confidence: input.diagnostics.behavior.confidence,
      actions: input.diagnostics.behavior.actions,
    },
    {
      category: "crossSource",
      title: input.diagnostics.crossSource.title,
      summary: input.diagnostics.crossSource.summary,
      confidence: input.diagnostics.crossSource.confidence,
      actions: input.diagnostics.crossSource.actions,
    },
  ];

  for (const section of sections) {
    const rows = sectionRows({
      workspaceId: input.workspaceId,
      createdAt,
      category: section.category,
      title: section.title,
      summary: section.summary,
      confidence: section.confidence,
      evidence: [`Section summary: ${section.summary}`],
      nextSteps: section.actions,
    });

    insights.push(rows.insight);
    recommendations.push(...rows.recommendations);
  }

  const groups: Array<{
    category: "seo" | "behavior" | "crossSource";
    rows: IntelligenceFinding[];
  }> = [
    { category: "seo", rows: input.diagnostics.seoFindings ?? [] },
    { category: "behavior", rows: input.diagnostics.behaviorFindings ?? [] },
    { category: "crossSource", rows: input.diagnostics.crossSourceFindings ?? [] },
  ];

  for (const group of groups) {
    for (const finding of group.rows) {
      const rows = sectionRows({
        workspaceId: input.workspaceId,
        createdAt,
        category: group.category,
        title: finding.title,
        summary: finding.summary,
        confidence: finding.confidence,
        evidence: finding.evidence ?? [],
        nextSteps: finding.nextSteps ?? [],
      });

      insights.push(rows.insight);
      recommendations.push(...rows.recommendations);
    }
  }

  return { insights, recommendations };
}