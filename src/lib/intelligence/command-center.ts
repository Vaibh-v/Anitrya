import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";

type CommandCenterInput = {
  workspaceId: string;
  projectId: string;
  baseScore: number;
  strongest: string;
  weakest: string;
};

export async function buildCommandCenter(input: CommandCenterInput) {
  const learning = await getOutcomeLearningSummary({
    workspaceId: input.workspaceId,
    projectSlug: input.projectId,
  });

  const confidenceShift =
    learning.sampleSize > 5
      ? learning.successRate * 20 - learning.failureRate * 10
      : 0;

  const adjustedScore = Math.max(
    0,
    Math.min(100, input.baseScore + confidenceShift)
  );

  return {
    priority: adjustedScore < 50 ? "high" : "medium",
    strongest: input.strongest,
    weakest: input.weakest,

    score: adjustedScore,

    learningSummary: {
      successRate: learning.successRate,
      avgImpact: learning.avgImpact,
      sampleSize: learning.sampleSize,
    },
  };
}