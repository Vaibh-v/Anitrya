import { getExecutionStates } from "@/lib/intelligence/execution-state-store";
import { listRecommendationOutcomes } from "@/lib/intelligence/outcome-store";
import type {
  ActivityFeedItem,
  ActivityFeedPayload,
} from "@/lib/intelligence/activity-feed-contracts";

function outcomeTone(status: string): "neutral" | "positive" | "warning" {
  if (status === "improved" || status === "implemented") return "positive";
  if (status === "rejected" || status === "no_impact") return "warning";
  return "neutral";
}

function outcomeLabel(status: string) {
  return status.replace(/_/g, " ");
}

export async function buildActivityFeedPayload(input: {
  workspaceId: string;
  projectId: string;
}): Promise<ActivityFeedPayload> {
  const [executionStates, outcomes] = await Promise.all([
    Promise.resolve(getExecutionStates(input.projectId)),
    listRecommendationOutcomes({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
      limit: 100,
    }),
  ]);

  const executionItems: ActivityFeedItem[] = executionStates.map((item) => ({
    id: `execution-${item.id}`,
    type: "execution",
    title: item.actionTitle,
    description: `Execution status updated to ${item.status.replace(/_/g, " ")}.`,
    tone:
      item.status === "completed"
        ? "positive"
        : item.status === "blocked"
        ? "warning"
        : "neutral",
    timestamp: item.updatedAt,
    meta: [`status: ${item.status.replace(/_/g, " ")}`],
  }));

  const outcomeItems: ActivityFeedItem[] = outcomes.map((item) => ({
    id: `outcome-${item.id}`,
    type: "outcome",
    title: item.recommendation_title,
    description: `Outcome recorded as ${outcomeLabel(item.outcome_status)}.`,
    tone: outcomeTone(item.outcome_status),
    timestamp: item.created_at.getTime(),
    meta: [
      `hypothesis: ${item.hypothesis_title}`,
      `impact Δ: ${item.impact_delta}`,
      item.outcome_note ? `note: ${item.outcome_note}` : "note: none",
    ],
  }));

  const learningItems: ActivityFeedItem[] =
    outcomes.length > 0
      ? [
          {
            id: `learning-${input.projectId}`,
            type: "learning",
            title: "Learning memory updated",
            description:
              "The intelligence layer has fresh outcome history available for future ranking and confidence shifts.",
            tone: "positive",
            timestamp: Math.max(...outcomes.map((item) => item.created_at.getTime())),
            meta: [`outcomes tracked: ${outcomes.length}`],
          },
        ]
      : [];

  const items = [...executionItems, ...outcomeItems, ...learningItems].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const positiveOutcomeCount = outcomes.filter(
    (item) =>
      item.outcome_status === "implemented" || item.outcome_status === "improved"
  ).length;

  const warningCount = outcomes.filter(
    (item) =>
      item.outcome_status === "rejected" || item.outcome_status === "no_impact"
  ).length;

  const summary =
    items.length > 0
      ? `Recent project activity is now visible across execution state, recorded outcomes, and intelligence learning memory.`
      : `No execution or outcome activity has been recorded yet for this project.`;

  return {
    projectId: input.projectId,
    summary,
    counts: {
      executionCount: executionStates.length,
      outcomeCount: outcomes.length,
      positiveOutcomeCount,
      warningCount,
    },
    items,
  };
}