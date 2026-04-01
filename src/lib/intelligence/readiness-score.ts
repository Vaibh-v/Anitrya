import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";

type Input = {
  workspaceId: string;
  projectId: string;
  evidenceScore: number;
};

export async function computeReadinessScore(input: Input) {
  const learning = await getOutcomeLearningSummary({
    workspaceId: input.workspaceId,
    projectSlug: input.projectId,
  });

  let score = input.evidenceScore;

  if (learning.sampleSize >= 5) {
    score += learning.successRate * 10;
    score -= learning.failureRate * 5;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    learningUsed: learning.sampleSize >= 5,
  };
}