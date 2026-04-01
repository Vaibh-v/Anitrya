import type { ProjectEvidence, ProjectDiagnostics } from "@/lib/evidence/types";
import type { ResolvedDateRange } from "@/lib/intelligence/contracts";

export type EngineProvider = "openai" | "anthropic" | "google";

export type EngineHypothesis = {
  title: string;
  rationale: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  nextSteps: string[];
};

export type EngineOutput = {
  provider: EngineProvider;
  model: string;
  hypotheses: EngineHypothesis[];
};

export type AdjudicatedConclusion = {
  summary: string;
  confidence: "low" | "medium" | "high";
  rankedHypotheses: EngineHypothesis[];
  missingData: string[];
};

function normalizeConfidence(value: number): "low" | "medium" | "high" {
  if (value >= 0.75) {
    return "high";
  }

  if (value >= 0.45) {
    return "medium";
  }

  return "low";
}

export function adjudicateStructuredEvidence(input: {
  evidence: ProjectEvidence;
  diagnostics: ProjectDiagnostics;
  dateRange: ResolvedDateRange;
  engineOutputs: EngineOutput[];
}): AdjudicatedConclusion {
  const ranked = [...input.engineOutputs.flatMap((item) => item.hypotheses)].sort(
    (left, right) => right.confidence - left.confidence
  );

  const missingData: string[] = [];

  if (input.evidence.gscQueryRows.length === 0) {
    missingData.push("GSC query-level rows are not yet available.");
  }

  if (input.evidence.gscPageRows.length === 0) {
    missingData.push("GSC page-level rows are not yet available.");
  }

  if (input.evidence.ga4LandingRows.length === 0) {
    missingData.push("GA4 landing-page rows are not yet available.");
  }

  const topConfidence = ranked[0]?.confidence ?? 0;

  return {
    summary:
      ranked[0]?.rationale ??
      `No adjudicated hypothesis yet for ${input.dateRange.label}. Evidence depth is still building.`,
    confidence: normalizeConfidence(topConfidence),
    rankedHypotheses: ranked,
    missingData,
  };
}