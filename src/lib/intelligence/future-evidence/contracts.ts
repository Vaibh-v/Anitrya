export type FutureEvidenceSource =
  | "google_business_profile"
  | "google_ads"
  | "google_trends";

export type FutureEvidenceState = "missing" | "preserved" | "connected";

export type FutureEvidenceCoverage = {
  source: FutureEvidenceSource;
  state: FutureEvidenceState;
  connectedNow: boolean;
  preservedForBuildout: boolean;
  metricsAvailable: string[];
  entitiesAvailable: string[];
  reasoningContribution: string[];
  blockers: string[];
  nextUnlock: string[];
};

export type GbpLocationPerformanceRow = {
  date: string;
  locationName: string;
  impressions: number;
  websiteClicks: number;
  calls: number;
  directionRequests: number;
};

export type GbpCategoryDemandRow = {
  date: string;
  categoryLabel: string;
  impressions: number;
  websiteClicks: number;
  calls: number;
};

export type GoogleAdsCampaignRow = {
  date: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  ctr: number;
  averageCpcMicros: number;
};

export type GoogleAdsSearchTermRow = {
  date: string;
  campaignName: string;
  adGroupName: string;
  searchTerm: string;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
};

export type GoogleTrendsTopicRow = {
  date: string;
  topic: string;
  interestScore: number;
};

export type GoogleTrendsComparisonRow = {
  date: string;
  brandInterest: number;
  categoryInterest: number;
  competitorInterest: number | null;
};

export type FutureEvidenceBundle = {
  coverage: FutureEvidenceCoverage[];
  gbpLocationRows: GbpLocationPerformanceRow[];
  gbpCategoryRows: GbpCategoryDemandRow[];
  adsCampaignRows: GoogleAdsCampaignRow[];
  adsSearchTermRows: GoogleAdsSearchTermRow[];
  trendsTopicRows: GoogleTrendsTopicRow[];
  trendsComparisonRows: GoogleTrendsComparisonRow[];
};

export function emptyFutureEvidenceBundle(): FutureEvidenceBundle {
  return {
    coverage: [],
    gbpLocationRows: [],
    gbpCategoryRows: [],
    adsCampaignRows: [],
    adsSearchTermRows: [],
    trendsTopicRows: [],
    trendsComparisonRows: [],
  };
}