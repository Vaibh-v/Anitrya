import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import { getActionOutcomeLearning } from "@/lib/intelligence/outcome-learning";
import {
  learningPriorityBoost,
  shouldDemoteAction,
  shouldPromoteAction,
} from "@/lib/intelligence/action-feedback-loop";

export type ExecutionQueueItem = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  blockedBy: string[];
  recommendedOwner: "seo" | "marketing" | "ops" | "dev";
};

export type ExecutionQueue = {
  projectId: string;
  items: ExecutionQueueItem[];
};

function ownerFromSource(source: string): "seo" | "marketing" | "ops" | "dev" {
  if (source === "seo" || source === "gsc") return "seo";
  if (source === "ga4" || source === "behavior") return "marketing";
  if (source === "cross_source" || source === "overview") return "ops";
  return "ops";
}

export async function buildExecutionQueue(
  projectId: string,
  workspaceId?: string
): Promise<ExecutionQueue> {
  const summary = await buildIntelligenceSummary(projectId);

  const missingItems: ExecutionQueueItem[] = summary.missingData.map(
    (item, index) => ({
      id: `missing-${index + 1}`,
      title: `Resolve ${item.source} evidence gap`,
      reason: item.reason,
      priority: "high",
      blockedBy: [`${item.source} evidence is incomplete`],
      recommendedOwner: ownerFromSource(item.source),
    })
  );

  const actionItems: ExecutionQueueItem[] = summary.actions.map((action, index) => ({
    id: `action-${index + 1}`,
    title: action.title,
    reason: action.steps[0] ?? "No execution step attached.",
    priority:
      action.impact === "high"
        ? "high"
        : action.impact === "medium"
        ? "medium"
        : "low",
    blockedBy: [],
    recommendedOwner: "ops",
  }));

  const items = [...missingItems, ...actionItems];

  if (!workspaceId) {
    return {
      projectId,
      items,
    };
  }

  const learning = await getActionOutcomeLearning({
    workspaceId,
    projectSlug: projectId,
  });

  const learningMap = new Map(learning.map((item) => [item.actionTitle, item]));

  const adjusted = items
    .map((item) => {
      const match =
        learningMap.get(item.title) ??
        learningMap.get(item.title.replace(/^Resolve\s+/i, "").trim()) ??
        learningMap.get(item.title.replace(/^Validate\s+/i, "").trim());

      if (!match) {
        return { ...item, _boost: 0 };
      }

      let priority = item.priority;
      if (shouldPromoteAction(match)) priority = "high";
      if (shouldDemoteAction(match)) priority = "low";

      return {
        ...item,
        priority,
        _boost: learningPriorityBoost(match),
      };
    })
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const byPriority = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (byPriority !== 0) return byPriority;
      return (b._boost ?? 0) - (a._boost ?? 0);
    })
    .map(({ _boost, ...item }) => item);

  return {
    projectId,
    items: adjusted,
  };
}