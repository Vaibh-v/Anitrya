import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import type { DecisionBrief } from "@/lib/intelligence/decision-brief-contracts";

export async function buildDecisionBrief(
  projectId: string
): Promise<DecisionBrief> {
  const summary = await buildIntelligenceSummary(projectId);

  const supportingEvidence =
    summary.evidence.length > 0
      ? summary.evidence.slice(0, 3).map((item) => ({
          label: `${item.source} · ${item.metric}`,
          detail: item.note ?? String(item.value),
        }))
      : [
          {
            label: "project context",
            detail: "Project context resolved successfully.",
          },
        ];

  const blockers = summary.missingData.map((item) => ({
    label: item.source,
    reason: item.reason,
  }));

  const orderedActions = summary.actions.flatMap((action) => action.steps).slice(0, 5);

  return {
    projectId,
    headline: "Primary decision brief",
    priority: blockers.length > 0 ? "high" : "medium",
    summary:
      blockers.length > 0
        ? "Confidence is currently constrained by missing evidence coverage, so the first priority is closing the highest-friction data gaps."
        : "Evidence coverage is sufficient to begin prioritizing action on the strongest diagnostic pattern.",
    supportingEvidence,
    blockers,
    orderedActions:
      orderedActions.length > 0
        ? orderedActions
        : ["No ordered actions are available yet."],
  };
}