import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import type {
  IntelligenceCategoryReadiness,
  IntelligenceReadinessScore,
} from "@/lib/intelligence/readiness-score-contracts";

function categoryLabel(key: IntelligenceCategoryReadiness["key"]) {
  if (key === "cross-source") return "Cross-source";
  if (key === "seo") return "SEO";
  if (key === "behavior") return "Behavior";
  return "Overview";
}

function categoryScore(
  key: IntelligenceCategoryReadiness["key"],
  missingSources: string[]
): IntelligenceCategoryReadiness {
  const blocked = missingSources.includes(key);

  if (blocked) {
    return {
      key,
      label: categoryLabel(key),
      score: 25,
      status: "blocked",
      reason: `${categoryLabel(key)} evidence is still incomplete.`,
    };
  }

  return {
    key,
    label: categoryLabel(key),
    score: 70,
    status: "partial",
    reason: `${categoryLabel(key)} has baseline structural coverage but still needs deeper evidence hydration.`,
  };
}

export async function buildReadinessScore(
  projectId: string
): Promise<IntelligenceReadinessScore> {
  const summary = await buildIntelligenceSummary(projectId);
  const missingSources = summary.missingData.map((item) => item.source);

  const categories: IntelligenceCategoryReadiness[] = [
    categoryScore("overview", missingSources),
    categoryScore("seo", missingSources),
    categoryScore("behavior", missingSources),
    categoryScore("cross-source", missingSources),
  ];

  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const overallScore = Math.round(
    categories.reduce((sum, item) => sum + item.score, 0) / categories.length
  );

  return {
    projectId,
    overallScore,
    strongestCategory: sorted[0]?.label ?? "Unknown",
    weakestCategory: sorted.at(-1)?.label ?? "Unknown",
    categories,
  };
}