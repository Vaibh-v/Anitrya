import type {
  FutureEvidenceCoverage,
  GoogleAdsCampaignRow,
  GoogleAdsSearchTermRow,
} from "@/lib/intelligence/future-evidence/contracts";

export type GoogleAdsPreparedEvidence = {
  coverage: FutureEvidenceCoverage;
  campaignRows: GoogleAdsCampaignRow[];
  searchTermRows: GoogleAdsSearchTermRow[];
};

export function buildPreservedGoogleAdsEvidence(): GoogleAdsPreparedEvidence {
  return {
    coverage: {
      source: "google_ads",
      state: "preserved",
      connectedNow: false,
      preservedForBuildout: true,
      metricsAvailable: [
        "clicks",
        "impressions",
        "cost",
        "conversions",
        "CTR",
        "average CPC",
      ],
      entitiesAvailable: ["campaigns", "search terms"],
      reasoningContribution: [
        "paid-acquisition quality diagnostics",
        "spend-to-outcome efficiency interpretation",
        "search-term intent versus site-performance comparison",
      ],
      blockers: [
        "Google Ads OAuth and account mapping are not connected yet",
        "No normalized ads persistence rows exist yet",
      ],
      nextUnlock: [
        "compare paid clicks with GA4 landing-page quality",
        "flag campaigns producing traffic without downstream conversion support",
        "separate spend inefficiency from landing-page inefficiency",
      ],
    },
    campaignRows: [],
    searchTermRows: [],
  };
}