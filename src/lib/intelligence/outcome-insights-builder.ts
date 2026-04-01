import { getOutcomeLearningSummary, getActionOutcomeLearning } from "@/lib/intelligence/outcome-learning";
import type {
  OutcomeInsightAction,
  OutcomeInsightsPayload,
} from "@/lib/intelligence/outcome-insights-contracts";

function toPercent(value: number) {
  return Math.round(value * 100);
}

function scoreAction(item: {
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
}) {
  return item.successRate * 50 - item.failureRate * 25 + item.avgImpact * 2 + item.sampleSize;
}

export async function buildOutcomeInsightsPayload(input: {
  workspaceId: string;
  projectId: string;
}): Promise<OutcomeInsightsPayload> {
  const [summary, byAction] = await Promise.all([
    getOutcomeLearningSummary({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
    }),
    getActionOutcomeLearning({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
    }),
  ]);

  const sortedStrongest = [...byAction]
    .sort((a, b) => scoreAction(b) - scoreAction(a))
    .slice(0, 3);

  const sortedWeakest = [...byAction]
    .sort((a, b) => scoreAction(a) - scoreAction(b))
    .slice(0, 3);

  const mapAction = (item: typeof byAction[number]): OutcomeInsightAction => ({
    actionTitle: item.actionTitle,
    successRate: item.successRate,
    failureRate: item.failureRate,
    avgImpact: item.avgImpact,
    sampleSize: item.sampleSize,
  });

  return {
    projectId: input.projectId,
    summary:
      summary.sampleSize > 0
        ? `Learning is now based on ${summary.sampleSize} recorded outcomes with a ${toPercent(summary.successRate)}% success rate and average impact of ${summary.avgImpact.toFixed(1)}.`
        : "No recommendation outcomes have been recorded yet, so learning visibility is still empty.",
    stats: [
      {
        label: "Tracked outcomes",
        value: summary.sampleSize,
        context: "Recorded recommendation outcomes contributing to system learning.",
      },
      {
        label: "Success rate",
        value: `${toPercent(summary.successRate)}%`,
        context: "Share of outcomes marked implemented or improved.",
      },
      {
        label: "Failure rate",
        value: `${toPercent(summary.failureRate)}%`,
        context: "Share of outcomes marked rejected.",
      },
      {
        label: "Average impact",
        value: summary.avgImpact.toFixed(1),
        context: "Average recorded impact delta across all outcomes.",
      },
    ],
    topActions: sortedStrongest.map(mapAction),
    weakestActions: sortedWeakest.map(mapAction),
  };
}