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

export type HypothesisCategory =
  | "overview"
  | "seo"
  | "behavior"
  | "cross_source";

export type RankedHypothesis = {
  id: string;
  title: string;
  summary: string;
  category: HypothesisCategory;
  score: number;
  confidence: ConfidenceLevel;
  evidence: string[];
  actions: string[];
  nextStep: string;
};

export type LearningAppliedHypothesis = RankedHypothesis & {
  learning: HistoricalAdjustment;
};

export type GeneratedHypothesis = {
  id: string;
  title: string;
  statement: string;
  confidence: ConfidenceLevel;
  score: number;
  evidence: string[];
  actions: string[];
  nextStep: string;
};

type GenericFinding = {
  id?: string;
  title?: string;
  summary?: string;
  statement?: string;
  category?: string;
  score?: number;
  confidence?: ConfidenceLevel;
  evidence?: string[];
  actions?: string[];
  nextStep?: string;
  priority?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function reliabilityToConfidence(reliability: number): ConfidenceLevel {
  if (reliability >= 0.75) return "high";
  if (reliability >= 0.5) return "medium";
  return "low";
}

function normalizeCategory(value?: string | null): HypothesisCategory {
  if (value === "seo") return "seo";
  if (value === "behavior") return "behavior";
  if (value === "cross_source" || value === "cross-source") return "cross_source";
  return "overview";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function defaultActionsForCategory(category: HypothesisCategory): string[] {
  if (category === "seo") {
    return [
      "Validate keyword and landing-page evidence for this pattern.",
      "Prioritize the highest-opportunity SEO pages for action.",
    ];
  }

  if (category === "behavior") {
    return [
      "Review landing-page and user-quality signals together.",
      "Check whether behavior friction is suppressing conversions.",
    ];
  }

  if (category === "cross_source") {
    return [
      "Validate that evidence aligns across traffic, SEO, and behavior.",
      "Resolve cross-source conflicts before escalating confidence.",
    ];
  }

  return [
    "Refresh synced evidence for this project.",
    "Review the strongest evidence points before acting.",
  ];
}

function normalizeFinding(finding: GenericFinding, index: number): RankedHypothesis {
  const category = normalizeCategory(finding.category);
  const score = clamp(
    typeof finding.score === "number"
      ? finding.score
      : typeof finding.priority === "number"
      ? finding.priority
      : 40,
    0,
    100
  );

  const evidence = asStringArray(finding.evidence);
  const actions = asStringArray(finding.actions);

  return {
    id: finding.id ?? `finding_${category}_${index + 1}`,
    title: finding.title ?? finding.statement ?? `Untitled ${category} finding`,
    summary:
      finding.summary ??
      finding.statement ??
      "Evidence is currently limited for this finding.",
    category,
    score,
    confidence: finding.confidence ?? computeConfidenceFromEvidence({
      score,
      evidenceCount: evidence.length,
      hasCrossSourceSupport: category === "cross_source",
      hasEntityLevelSupport: category === "seo" || category === "behavior",
      historicalConfidenceLift: 0,
    }),
    evidence:
      evidence.length > 0
        ? evidence
        : ["No explicit evidence points were attached to this finding yet."],
    actions: actions.length > 0 ? actions : defaultActionsForCategory(category),
    nextStep:
      finding.nextStep ??
      "Review underlying evidence, validate source coverage, and refresh sync before acting.",
  };
}

function collectFindings(input: unknown): GenericFinding[] {
  if (Array.isArray(input)) {
    return input as GenericFinding[];
  }

  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as Record<string, unknown>;
  const findings: GenericFinding[] = [];
  const directKeys = ["findings", "hypotheses", "items", "rows"];

  for (const key of directKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      findings.push(...(value as GenericFinding[]));
    }
  }

  const categoryKeys: Array<[string, HypothesisCategory]> = [
    ["overview", "overview"],
    ["seo", "seo"],
    ["behavior", "behavior"],
    ["crossSource", "cross_source"],
    ["cross_source", "cross_source"],
  ];

  for (const [key, category] of categoryKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      for (const item of value as GenericFinding[]) {
        findings.push({
          ...item,
          category: item.category ?? category,
        });
      }
      continue;
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of directKeys) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) {
          for (const item of nestedValue as GenericFinding[]) {
            findings.push({
              ...item,
              category: item.category ?? category,
            });
          }
        }
      }
    }
  }

  return findings;
}

export function findingsForCategory(
  input: unknown,
  category: HypothesisCategory
): RankedHypothesis[] {
  return collectFindings(input)
    .filter((finding) => normalizeCategory(finding.category) === category)
    .map((finding, index) => normalizeFinding(finding, index))
    .sort((a, b) => b.score - a.score);
}

export function rankProjectHypotheses(input: unknown): RankedHypothesis[] {
  const normalized = collectFindings(input).map((finding, index) =>
    normalizeFinding(finding, index)
  );

  if (normalized.length > 0) {
    return normalized.sort((a, b) => b.score - a.score);
  }

  const base = getHistoricalAdjustment("overview_zero_conversion_risk");
  const score = clamp(38 + base.scoreAdjustment, 0, 100);

  return [
    {
      id: "missing_evidence_baseline",
      title: "Evidence coverage is still incomplete",
      summary:
        "Reliable multi-source evidence is still incomplete for this project, so interpretation should remain cautious.",
      category: "overview",
      score,
      confidence: computeConfidenceFromEvidence({
        score,
        evidenceCount: 1,
        hasCrossSourceSupport: false,
        hasEntityLevelSupport: false,
        historicalConfidenceLift: base.confidenceAdjustment,
      }),
      evidence: [
        "Historical memory is available, but live normalized evidence is still limited.",
        "Cross-source support is not yet strong enough for a high-confidence claim.",
      ],
      actions: [
        "Complete source connections for the active project.",
        "Run sync and refresh project diagnostics.",
      ],
      nextStep:
        "Complete source connections, run sync, and re-evaluate once normalized GA4 and GSC evidence is available.",
    },
  ];
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

export async function applyLearningToHypotheses(input: {
  workspaceId: string;
  projectId: string;
  hypotheses: Array<{
    id: string;
    title: string;
    category?: HypothesisCategory;
    summary?: string;
    statement?: string;
    score: number;
    confidence: "low" | "medium" | "high";
    evidence?: string[];
    actions?: string[];
    nextStep?: string;
  }>;
}): Promise<LearningAppliedHypothesis[]> {
  const adjusted: LearningAppliedHypothesis[] = [];

  for (const hypothesis of input.hypotheses) {
    const learned = await getLearnedAdjustmentFromOutcomes({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
      hypothesisTitle: hypothesis.title,
    });

    const newScore = Math.max(0, Math.min(100, hypothesis.score + learned.scoreAdjustment));
    const evidence = Array.isArray(hypothesis.evidence) ? hypothesis.evidence : [];
    const actions = Array.isArray(hypothesis.actions) ? hypothesis.actions : [];

    const confidence = computeConfidenceFromEvidence({
      score: newScore,
      evidenceCount: evidence.length > 0 ? evidence.length : 3,
      hasCrossSourceSupport: hypothesis.category === "cross_source",
      hasEntityLevelSupport:
        hypothesis.category === "seo" || hypothesis.category === "behavior",
      historicalConfidenceLift: learned.confidenceAdjustment,
    });

    adjusted.push({
      id: hypothesis.id,
      title: hypothesis.title,
      summary:
        hypothesis.summary ??
        hypothesis.statement ??
        "No summary is available for this hypothesis.",
      category: hypothesis.category ?? "overview",
      score: newScore,
      confidence,
      evidence:
        evidence.length > 0
          ? evidence
          : ["No explicit evidence points are attached yet."],
      actions:
        actions.length > 0
          ? actions
          : defaultActionsForCategory(hypothesis.category ?? "overview"),
      nextStep:
        hypothesis.nextStep ??
        "Review evidence depth and validate whether execution history supports promotion.",
      learning: learned,
    });
  }

  return adjusted.sort((a, b) => b.score - a.score);
}

export async function generateHypotheses(
  projectId: string
): Promise<GeneratedHypothesis[]> {
  const ranked = rankProjectHypotheses({
    findings: [
      {
        id: "baseline",
        title: "Evidence coverage is still incomplete",
        summary:
          "Reliable multi-source evidence is still incomplete for this project, so interpretation should remain cautious.",
        category: "overview",
        score: 42,
        evidence: [
          `Project context resolved: ${projectId}`,
          "Historical memory is available, but live normalized evidence is still limited.",
          "Cross-source support is not yet strong enough for a high-confidence claim.",
        ],
        actions: [
          "Complete source connections.",
          "Run sync for the active project.",
        ],
        nextStep:
          "Complete source connections, run sync, and re-evaluate once normalized GA4 and GSC evidence is available.",
      },
    ],
  });

  return ranked.map((item) => ({
    id: item.id,
    title: item.title,
    statement: item.summary,
    confidence: item.confidence,
    score: item.score,
    evidence: item.evidence,
    actions: item.actions,
    nextStep: item.nextStep,
  }));
}