export type IntelligenceCategory =
  | "traffic_drop"
  | "query_opportunity"
  | "page_opportunity"
  | "source_concentration"
  | "market_context"
  | "data_gap"
  | "other";

export type IntelligenceSeverity = "low" | "medium" | "high";

export type IntelligenceDataSufficiency =
  | "sufficient"
  | "partial"
  | "insufficient";

export type DateRangePreset =
  | "7d"
  | "30d"
  | "90d"
  | "180d"
  | "365d"
  | "custom";

export type ResolvedDateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
  label: string;
  days: number;
};

export type SourceKey =
  | "ga4"
  | "gsc"
  | "gmb"
  | "google_ads"
  | "google_trends"
  | "meta_ad_library";

export type SourceConnection = {
  source: SourceKey;
  connected: boolean;
  synced: boolean;
  message: string;
};

export type DailyPoint = {
  date: string;
  users?: number;
  sessions?: number;
  engagedSessions?: number;
  engagementRate?: number;
  conversions?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type ProjectDataBundle = {
  project: {
    id?: string;
    slug: string;
    name: string;
    workspaceId?: string | null;
    ga4PropertyId?: string | null;
    gscSiteUrl?: string | null;
  } | null;
  dateRange: ResolvedDateRange;
  connections: SourceConnection[];
  ga4Daily: DailyPoint[];
  gscDaily: DailyPoint[];
  gscQueries: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  gscPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  ga4Landings: Array<{
    page: string;
    sessions: number;
    users: number;
    conversions: number;
    engagementRate: number | null;
  }>;
  ga4Sources: Array<{
    sourceMedium: string;
    sessions: number;
    users: number;
    conversions: number;
    engagementRate: number | null;
  }>;
};

export type IntelligenceEvidenceRef = {
  table:
    | "ga4_source_daily"
    | "ga4_landing_page_daily"
    | "gsc_query_daily"
    | "gsc_page_daily"
    | "public_market_evidence";
  from: string;
  to: string;
  filters?: Record<string, string>;
  metrics?: Record<string, number>;
  sourceTitle?: string;
  sourceUrl?: string;
  evidenceClass?: string;
  claim?: string;
};

export type IntelligenceInsight = {
  insightId: string;
  runKey: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  analysisWindowFrom: string;
  analysisWindowTo: string;
  category: IntelligenceCategory;
  severity: IntelligenceSeverity;
  hypothesisRank: number;
  priorityScore: number;
  impactEstimatedClicks: number;
  evidenceSummary: string;
  missingDataReason: string;
  title: string;
  finding: string;
  rationale: string;
  evidence: IntelligenceEvidenceRef[];
  recommendedAction: string;
  dataSufficiency: IntelligenceDataSufficiency;
  missingData: string[];
  modelProvider: string;
  modelVersion: string;
  generatedAt: string;
};

export type IntelligenceRecommendation = {
  recommendationId: string;
  runKey: string;
  insightId: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  priority: 1 | 2 | 3;
  priorityScore: number;
  title: string;
  action: string;
  expectedOutcome: string;
  evidenceSummary: string;
  impactEstimatedClicks: number;
  evidence: IntelligenceEvidenceRef[];
  generatedAt: string;
};

export type IntelligenceRunInput = {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
};

export type IntelligenceRunOutput = {
  insights: IntelligenceInsight[];
  recommendations: IntelligenceRecommendation[];
};
