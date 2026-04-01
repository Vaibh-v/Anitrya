import type {
  FutureEvidenceCoverage,
  GbpCategoryDemandRow,
  GbpLocationPerformanceRow,
} from "@/lib/intelligence/future-evidence/contracts";

export type GbpPreparedEvidence = {
  coverage: FutureEvidenceCoverage;
  locationRows: GbpLocationPerformanceRow[];
  categoryRows: GbpCategoryDemandRow[];
};

export function buildPreservedGbpEvidence(): GbpPreparedEvidence {
  return {
    coverage: {
      source: "google_business_profile",
      state: "preserved",
      connectedNow: false,
      preservedForBuildout: true,
      metricsAvailable: [
        "impressions",
        "website clicks",
        "calls",
        "direction requests",
      ],
      entitiesAvailable: ["locations", "categories"],
      reasoningContribution: [
        "local-intent demand interpretation",
        "offline-to-online visibility diagnostics",
        "location-level performance comparison",
      ],
      blockers: [
        "GBP OAuth and account discovery are not connected yet",
        "No normalized GBP persistence rows exist yet",
      ],
      nextUnlock: [
        "compare local demand with GA4 landing quality",
        "separate store-level visibility weakness from website conversion weakness",
        "connect calls and direction requests with local-intent performance",
      ],
    },
    locationRows: [],
    categoryRows: [],
  };
}