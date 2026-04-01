import { buildDecisionBrief } from "@/lib/intelligence/decision-brief-builder";
import { buildReadinessScore } from "@/lib/intelligence/readiness-score-builder";
import { buildExecutionQueue } from "@/lib/intelligence/execution-queue-builder";
import { getExecutionStates } from "@/lib/intelligence/execution-state-store";
import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";
import type {
  CommandCenterOwnerLoad,
  CommandCenterPayload,
} from "@/lib/intelligence/command-center-contracts";

export async function buildCommandCenterPayload(
  projectId: string,
  workspaceId?: string
): Promise<CommandCenterPayload> {
  const [brief, readiness, queue] = await Promise.all([
    buildDecisionBrief(projectId),
    buildReadinessScore(projectId),
    buildExecutionQueue(projectId, workspaceId),
  ]);

  const execution = getExecutionStates(projectId);
  const completedCount = execution.filter(
    (item) => item.status === "completed"
  ).length;

  const learning = workspaceId
    ? await getOutcomeLearningSummary({
        workspaceId,
        projectSlug: projectId,
      })
    : {
        successRate: 0,
        failureRate: 0,
        avgImpact: 0,
        sampleSize: 0,
      };

  const ownerCounts = new Map<CommandCenterOwnerLoad["owner"], number>([
    ["seo", 0],
    ["marketing", 0],
    ["ops", 0],
    ["dev", 0],
  ]);

  for (const item of queue.items) {
    ownerCounts.set(
      item.recommendedOwner,
      (ownerCounts.get(item.recommendedOwner) ?? 0) + 1
    );
  }

  const ownerLoad: CommandCenterOwnerLoad[] = Array.from(ownerCounts.entries())
    .map(([owner, count]) => ({ owner, count }))
    .filter((item) => item.count > 0);

  const learningSignal =
    learning.sampleSize > 5
      ? "System is now adapting based on historical execution outcomes."
      : "Learning is still limited due to insufficient outcome history.";

  const learningLine =
    learning.sampleSize > 0
      ? ` Learning is based on ${learning.sampleSize} tracked outcomes with ${Math.round(
          learning.successRate * 100
        )}% success and average impact ${learning.avgImpact.toFixed(1)}.`
      : "";

  return {
    projectId,
    headline: "Command center",
    summary:
      brief.summary +
      (completedCount > 0
        ? ` ${completedCount} actions have already been completed.`
        : "") +
      learningLine +
      ` ${learningSignal}`,
    priority: brief.priority,
    overallScore: readiness.overallScore,
    strongestCategory: readiness.strongestCategory,
    weakestCategory: readiness.weakestCategory,
    blockers: brief.blockers,
    ownerLoad,
    firstActions: brief.orderedActions.slice(0, 4),
  };
}