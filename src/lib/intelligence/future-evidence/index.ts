import {
  emptyFutureEvidenceBundle,
  type FutureEvidenceBundle,
} from "./contracts";
import { buildPreservedGbpEvidence } from "./gbp";
import { buildPreservedGoogleAdsEvidence } from "./google-ads";
import { buildPreservedGoogleTrendsEvidence } from "./google-trends";

export function buildFutureEvidenceBundle(): FutureEvidenceBundle {
  const base = emptyFutureEvidenceBundle();

  const gbp = buildPreservedGbpEvidence();
  const ads = buildPreservedGoogleAdsEvidence();
  const trends = buildPreservedGoogleTrendsEvidence();

  return {
    ...base,
    coverage: [gbp.coverage, ads.coverage, trends.coverage],
    gbpLocationRows: gbp.locationRows,
    gbpCategoryRows: gbp.categoryRows,
    adsCampaignRows: ads.campaignRows,
    adsSearchTermRows: ads.searchTermRows,
    trendsTopicRows: trends.topicRows,
    trendsComparisonRows: trends.comparisonRows,
  };
}

export type {
  FutureEvidenceBundle,
  FutureEvidenceCoverage,
  FutureEvidenceSource,
  FutureEvidenceState,
  GbpLocationPerformanceRow,
  GbpCategoryDemandRow,
  GoogleAdsCampaignRow,
  GoogleAdsSearchTermRow,
  GoogleTrendsTopicRow,
  GoogleTrendsComparisonRow,
} from "./contracts";