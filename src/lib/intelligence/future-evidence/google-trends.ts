import type {
  FutureEvidenceCoverage,
  GoogleTrendsComparisonRow,
  GoogleTrendsTopicRow,
} from "@/lib/intelligence/future-evidence/contracts";

export type GoogleTrendsPreparedEvidence = {
  coverage: FutureEvidenceCoverage;
  topicRows: GoogleTrendsTopicRow[];
  comparisonRows: GoogleTrendsComparisonRow[];
};

export function buildPreservedGoogleTrendsEvidence(): GoogleTrendsPreparedEvidence {
  return {
    coverage: {
      source: "google_trends",
      state: "preserved",
      connectedNow: false,
      preservedForBuildout: true,
      metricsAvailable: [
        "interest score",
        "brand demand movement",
        "category demand movement",
        "competitor demand movement",
      ],
      entitiesAvailable: ["topics", "comparisons"],
      reasoningContribution: [
        "market-demand interpretation",
        "seasonality context",
        "brand-versus-category movement comparison",
      ],
      blockers: [
        "Google Trends collection layer is not connected yet",
        "No normalized trends persistence rows exist yet",
      ],
      nextUnlock: [
        "separate internal performance drops from market softening",
        "compare branded demand against category demand over time",
        "add seasonality context to SEO and acquisition interpretation",
      ],
    },
    topicRows: [],
    comparisonRows: [],
  };
}