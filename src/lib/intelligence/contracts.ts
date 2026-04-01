export type SourceKey =
  | "ga4"
  | "gsc"
  | "gmb"
  | "google_ads"
  | "google_trends"
  | "meta_ad_library";

export type DateRangePreset = "7d" | "30d" | "90d" | "180d" | "365d" | "custom";

export type ResolvedDateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
  label: string;
  days: number;
};

export type DailyPoint = {
  date: string;
  sessions?: number;
  users?: number;
  conversions?: number;
  engagementRate?: number | null;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type QueryPoint = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type PagePoint = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type LandingPoint = {
  page: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

export type SourceMediumPoint = {
  sourceMedium: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

export type SourceConnection = {
  source: SourceKey;
  connected: boolean;
  synced: boolean;
  message?: string | null;
};

export type ProjectDataBundle = {
  project: {
    id?: string;
    slug: string;
    name: string;
    ga4PropertyId?: string | null;
    gscSiteUrl?: string | null;
  } | null;
  dateRange: ResolvedDateRange;
  connections: SourceConnection[];
  ga4Daily: DailyPoint[];
  gscDaily: DailyPoint[];
  gscQueries: QueryPoint[];
  gscPages: PagePoint[];
  ga4Landings: LandingPoint[];
  ga4Sources: SourceMediumPoint[];
};