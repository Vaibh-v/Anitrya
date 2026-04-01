import { listRecommendationOutcomes } from "@/lib/intelligence/outcome-store";

export type OutcomeLearningSummary = {
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
};

export type ActionOutcomeLearningSummary = {
  actionTitle: string;
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
};

function safeDivide(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

export async function getOutcomeLearningSummary(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<OutcomeLearningSummary> {
  const outcomes = await listRecommendationOutcomes({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    limit: 200,
  });

  if (outcomes.length === 0) {
    return {
      successRate: 0,
      failureRate: 0,
      avgImpact: 0,
      sampleSize: 0,
    };
  }

  let success = 0;
  let failure = 0;
  let totalImpact = 0;

  for (const outcome of outcomes) {
    if (
      outcome.outcome_status === "implemented" ||
      outcome.outcome_status === "improved"
    ) {
      success += 1;
    }

    if (outcome.outcome_status === "rejected") {
      failure += 1;
    }

    totalImpact += typeof outcome.impact_delta === "number" ? outcome.impact_delta : 0;
  }

  return {
    successRate: safeDivide(success, outcomes.length),
    failureRate: safeDivide(failure, outcomes.length),
    avgImpact: safeDivide(totalImpact, outcomes.length),
    sampleSize: outcomes.length,
  };
}

export async function getActionOutcomeLearning(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<ActionOutcomeLearningSummary[]> {
  const outcomes = await listRecommendationOutcomes({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    limit: 500,
  });

  const grouped = new Map<
    string,
    { success: number; failure: number; totalImpact: number; sampleSize: number }
  >();

  for (const outcome of outcomes) {
    const key = outcome.recommendation_title;
    const current =
      grouped.get(key) ?? { success: 0, failure: 0, totalImpact: 0, sampleSize: 0 };

    if (
      outcome.outcome_status === "implemented" ||
      outcome.outcome_status === "improved"
    ) {
      current.success += 1;
    }

    if (outcome.outcome_status === "rejected") {
      current.failure += 1;
    }

    current.totalImpact += typeof outcome.impact_delta === "number" ? outcome.impact_delta : 0;
    current.sampleSize += 1;

    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([actionTitle, value]) => ({
      actionTitle,
      successRate: safeDivide(value.success, value.sampleSize),
      failureRate: safeDivide(value.failure, value.sampleSize),
      avgImpact: safeDivide(value.totalImpact, value.sampleSize),
      sampleSize: value.sampleSize,
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);
}