import type { ConfidenceLevel } from "@/lib/evidence/types";
import { listRecommendationOutcomes } from "@/lib/intelligence/outcome-store";

export type HistoricalAdjustment = {
  scoreAdjustment: number;
  confidenceAdjustment: 0 | 1 | 2;
  reliabilityLabel: ConfidenceLevel;
};

type SeededSignal = {
  hypothesisId: string;
  successRate: number;
  sampleSize: number;
  reliability: number;
};

const SEEDED_MEMORY: SeededSignal[] = [
  { hypothesisId: "seo_ctr_capture_gap", successRate: 0.72, sampleSize: 18, reliability: 0.78 },
  { hypothesisId: "seo_mid_position_opportunity", successRate: 0.64, sampleSize: 14, reliability: 0.7 },
  { hypothesisId: "behavior_landing_quality_gap", successRate: 0.68, sampleSize: 16, reliability: 0.74 },
  { hypothesisId: "behavior_source_quality_conflict", successRate: 0.61, sampleSize: 11, reliability: 0.64 },
  { hypothesisId: "cross_source_page_mismatch", successRate: 0.57, sampleSize: 9, reliability: 0.58 },
  { hypothesisId: "overview_zero_conversion_risk", successRate: 0.76, sampleSize: 12, reliability: 0.77 },
  { hypothesisId: "cross_source_visibility_to_behavior_gap", successRate: 0.66, sampleSize: 10, reliability: 0.68 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function reliabilityToConfidence(reliability: number): ConfidenceLevel {
  if (reliability >= 0.75) return "high";
  if (reliability >= 0.5) return "medium";
  return "low";
}

export function getHistoricalAdjustment(hypothesisId: string): HistoricalAdjustment {
  const signal = SEEDED_MEMORY.find((item) => item.hypothesisId === hypothesisId);

  if (!signal) {
    return {
      scoreAdjustment: 0,
      confidenceAdjustment: 0,
      reliabilityLabel: "low",
    };
  }

  const sampleWeight = Math.min(signal.sampleSize / 20, 1);
  const adjustment = (signal.successRate - 0.5) * 30 * sampleWeight * signal.reliability;

  let confidenceAdjustment: 0 | 1 | 2 = 0;
  if (signal.sampleSize >= 10 && signal.reliability >= 0.6) confidenceAdjustment = 1;
  if (signal.sampleSize >= 18 && signal.reliability >= 0.75) confidenceAdjustment = 2;

  return {
    scoreAdjustment: Math.round(adjustment),
    confidenceAdjustment,
    reliabilityLabel: reliabilityToConfidence(signal.reliability),
  };
}

export async function getLearnedAdjustmentFromOutcomes(input: {
  workspaceId: string;
  projectSlug: string;
  hypothesisTitle: string;
}): Promise<HistoricalAdjustment> {
  const outcomes = await listRecommendationOutcomes({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    hypothesisTitle: input.hypothesisTitle,
    limit: 50,
  });

  if (outcomes.length === 0) {
    return {
      scoreAdjustment: 0,
      confidenceAdjustment: 0,
      reliabilityLabel: "low",
    };
  }

  let positive = 0;
  let negative = 0;
  let totalImpact = 0;

  for (const outcome of outcomes) {
    if (outcome.outcome_status === "implemented" || outcome.outcome_status === "improved") {
      positive += 1;
    }
    if (outcome.outcome_status === "rejected") {
      negative += 1;
    }
    totalImpact += typeof outcome.impact_delta === "number" ? outcome.impact_delta : 0;
  }

  const successRate = positive / outcomes.length;
  const failureRate = negative / outcomes.length;
  const reliability = Math.min(outcomes.length / 12, 1);

  let confidenceAdjustment: 0 | 1 | 2 = 0;
  if (outcomes.length >= 4) confidenceAdjustment = 1;
  if (outcomes.length >= 10 && successRate >= 0.6) confidenceAdjustment = 2;

  const scoreAdjustment = clamp(
    Math.round((successRate - failureRate) * 18 + totalImpact),
    -25,
    25
  );

  return {
    scoreAdjustment,
    confidenceAdjustment,
    reliabilityLabel: reliabilityToConfidence(reliability),
  };
}

export function computeConfidenceFromEvidence(input: {
  score: number;
  evidenceCount: number;
  hasCrossSourceSupport: boolean;
  hasEntityLevelSupport: boolean;
  historicalConfidenceLift?: 0 | 1 | 2;
}): ConfidenceLevel {
  let adjusted = input.score;

  if (input.evidenceCount >= 4) adjusted += 8;
  if (input.evidenceCount >= 6) adjusted += 6;
  if (input.hasCrossSourceSupport) adjusted += 10;
  if (input.hasEntityLevelSupport) adjusted += 8;

  if (input.historicalConfidenceLift === 1) adjusted += 6;
  if (input.historicalConfidenceLift === 2) adjusted += 12;

  if (adjusted >= 82) return "high";
  if (adjusted >= 52) return "medium";
  return "low";
}