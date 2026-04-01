import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";
import { buildEvidenceDrivenHypothesisSeeds } from "@/lib/intelligence/evidence-ingestion";

export type CrossSourceHypothesis = {
  id: string;
  title: string;
  category: "overview" | "seo" | "behavior" | "cross_source";
  confidence: "low" | "medium" | "high";
  rank: number;
  summary: string;
  evidence: string[];
  blockers: string[];
  actions: string[];
};

function confidenceFromRank(rank: number): "low" | "medium" | "high" {
  if (rank >= 75) return "high";
  if (rank >= 45) return "medium";
  return "low";
}

export async function buildCrossSourceHypotheses(input: {
  workspaceId: string;
  projectId: string;
}): Promise<CrossSourceHypothesis[]> {
  const [summary, learning, evidenceSeeds] = await Promise.all([
    buildIntelligenceSummary(input.projectId),
    getOutcomeLearningSummary({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
    }),
    buildEvidenceDrivenHypothesisSeeds(input.projectId),
  ]);

  const blockers = summary.missingData.map(
    (item) => `${item.source}: ${item.reason}`
  );

  const seededHypotheses: CrossSourceHypothesis[] = evidenceSeeds.map((seed) => ({
    id: seed.id,
    title: seed.title,
    category: seed.category,
    rank: seed.score,
    confidence: confidenceFromRank(seed.score),
    summary: seed.summary,
    evidence: seed.evidence,
    blockers,
    actions: seed.actions,
  }));

  if (learning.sampleSize > 0) {
    seededHypotheses.push({
      id: "outcome-learning-visible",
      title: "Outcome learning is now visible but still shallow",
      category: "behavior",
      rank: learning.sampleSize >= 3 ? 58 : 34,
      confidence: confidenceFromRank(learning.sampleSize >= 3 ? 58 : 34),
      summary:
        learning.sampleSize >= 3
          ? `The system has enough tracked outcomes to start influencing future interpretation (${learning.sampleSize} recorded outcomes).`
          : "Outcome learning exists, but sample size remains too small to strongly shift interpretation.",
      evidence: [
        `Tracked outcomes: ${learning.sampleSize}`,
        `Success rate: ${Math.round(learning.successRate * 100)}%`,
        `Average impact: ${learning.avgImpact.toFixed(1)}`,
      ],
      blockers:
        learning.sampleSize >= 3
          ? []
          : ["Not enough completed outcomes exist to materially influence ranking."],
      actions: [
        "Keep recording outcomes after actions are executed.",
        "Use impact delta consistently for better learning quality.",
      ],
    });
  }

  return seededHypotheses.sort((a, b) => b.rank - a.rank);
}