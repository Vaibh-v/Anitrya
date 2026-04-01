import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";

type QueueItem = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  recommendedOwner: "seo" | "marketing" | "ops" | "dev";
};

export async function buildExecutionQueue(input: {
  workspaceId: string;
  projectId: string;
  items: QueueItem[];
}) {
  const learning = await getOutcomeLearningSummary({
    workspaceId: input.workspaceId,
    projectSlug: input.projectId,
  });

  function learningBoost(title: string) {
    if (learning.sampleSize < 5) return 0;
    return learning.successRate * 10 - learning.failureRate * 5;
  }

  const sorted = [...input.items].sort((a, b) => {
    return learningBoost(b.title) - learningBoost(a.title);
  });

  return {
    projectId: input.projectId,
    items: sorted,
  };
}