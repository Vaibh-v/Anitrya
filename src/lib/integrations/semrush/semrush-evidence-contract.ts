/**
 * SEMrush evidence contract.
 *
 * Pure types + constants only (no prisma, no fetch) so it can be imported by
 * the connector, the store, the export adapter, the intelligence adapter and
 * tests without pulling in server runtime dependencies.
 *
 * Storage shape is "long": one row per (project, snapshot, entity, metric).
 * SEMrush Analytics API v3 data is a modelled market snapshot, not a daily
 * first-party measurement, so every row carries:
 *   - `date`          the snapshot date (UTC day the data was fetched)
 *   - `windowFrom/To` the sync window that requested it (for traceability)
 *   - `availability`  whether the report was complete or a truncated top-N
 *   - `confidence`    how much downstream reasoning should trust the metric
 *   - `isEstimate`    whether SEMrush models the value (traffic, cost, volume)
 */

export const SEMRUSH_PROVIDER_KEY = "semrush" as const;
export const SEMRUSH_SYNC_SOURCE = "SEMRUSH" as const;
export const SEMRUSH_EVIDENCE_TABLE = "semrush_evidence_snapshot" as const;
export const SEMRUSH_SOURCE_VERSION = "analytics_v3" as const;
export const SEMRUSH_API_BASE_URL = "https://api.semrush.com/";

/** Default SEMrush regional database when a mapping does not specify one. */
export const SEMRUSH_DEFAULT_DATABASE = "us";

/** Keyword rows requested per sync. Each row costs SEMrush API units. */
export const SEMRUSH_DEFAULT_KEYWORD_LIMIT = 100;
export const SEMRUSH_MAX_KEYWORD_LIMIT = 1000;
export const SEMRUSH_KEYWORD_LIMIT_ENV = "SEMRUSH_KEYWORD_LIMIT";

export type SemrushReportType = "domain_ranks" | "domain_organic";
export type SemrushEntityType = "domain" | "keyword";
export type SemrushAvailability = "available" | "partial";
export type SemrushConfidence = "low" | "medium" | "high";

export type SemrushDomainMetric =
  | "semrush_rank"
  | "organic_keywords"
  | "organic_traffic"
  | "organic_cost"
  | "adwords_keywords"
  | "adwords_traffic"
  | "adwords_cost";

export type SemrushKeywordMetric =
  | "position"
  | "previous_position"
  | "search_volume"
  | "cpc"
  | "traffic_percent"
  | "traffic_cost_percent"
  | "competition";

export type SemrushMetric = SemrushDomainMetric | SemrushKeywordMetric;

export type SemrushMetricDefinition = {
  metric: SemrushMetric;
  /** SEMrush export_columns code. */
  column: string;
  confidence: SemrushConfidence;
  isEstimate: boolean;
};

/**
 * Column order matters: SEMrush returns columns in the order requested, and
 * the normalizer maps values by position.
 */
export const SEMRUSH_DOMAIN_RANKS_COLUMNS: Array<
  { column: string; metric: SemrushDomainMetric | null } & Partial<
    Pick<SemrushMetricDefinition, "confidence" | "isEstimate">
  >
> = [
  { column: "Db", metric: null },
  { column: "Dn", metric: null },
  { column: "Rk", metric: "semrush_rank", confidence: "medium", isEstimate: true },
  { column: "Or", metric: "organic_keywords", confidence: "medium", isEstimate: true },
  { column: "Ot", metric: "organic_traffic", confidence: "low", isEstimate: true },
  { column: "Oc", metric: "organic_cost", confidence: "low", isEstimate: true },
  { column: "Ad", metric: "adwords_keywords", confidence: "medium", isEstimate: true },
  { column: "At", metric: "adwords_traffic", confidence: "low", isEstimate: true },
  { column: "Ac", metric: "adwords_cost", confidence: "low", isEstimate: true },
];

export const SEMRUSH_DOMAIN_ORGANIC_COLUMNS: Array<
  { column: string; metric: SemrushKeywordMetric | null; role?: "keyword" | "url" } & Partial<
    Pick<SemrushMetricDefinition, "confidence" | "isEstimate">
  >
> = [
  { column: "Ph", metric: null, role: "keyword" },
  { column: "Po", metric: "position", confidence: "medium", isEstimate: false },
  { column: "Pp", metric: "previous_position", confidence: "medium", isEstimate: false },
  { column: "Nq", metric: "search_volume", confidence: "medium", isEstimate: true },
  { column: "Cp", metric: "cpc", confidence: "medium", isEstimate: true },
  { column: "Ur", metric: null, role: "url" },
  { column: "Tr", metric: "traffic_percent", confidence: "low", isEstimate: true },
  { column: "Tc", metric: "traffic_cost_percent", confidence: "low", isEstimate: true },
  { column: "Co", metric: "competition", confidence: "medium", isEstimate: true },
];

/** Normalized, project-scoped SEMrush evidence row (storage + export + intelligence). */
export type SemrushEvidenceRow = {
  workspaceId: string;
  projectSlug: string;
  /** Snapshot date, YYYY-MM-DD (UTC). */
  date: string;
  /** Sync window that requested the snapshot, YYYY-MM-DD. */
  windowFrom: string;
  windowTo: string;
  domain: string;
  /** SEMrush regional database code, e.g. "us", "uk", "in". */
  databaseCode: string;
  reportType: SemrushReportType;
  entityType: SemrushEntityType;
  keyword: string | null;
  pageUrl: string | null;
  metric: SemrushMetric;
  value: number | null;
  source: typeof SEMRUSH_PROVIDER_KEY;
  sourceVersion: typeof SEMRUSH_SOURCE_VERSION;
  availability: SemrushAvailability;
  confidence: SemrushConfidence;
  isEstimate: boolean;
  /** ISO timestamp of the API fetch. */
  fetchedAt: string;
};

/** Project -> SEMrush domain mapping (stored in the SyncRun ledger, like Ads/GBP). */
export type SemrushDomainMapping = {
  projectSlug: string;
  domain: string;
  databaseCode: string;
  savedAt: string;
};

export const SEMRUSH_MAPPING_STATUS = "semrush_domain_mapping_saved";

/** Result of parsing one SEMrush API response body. */
export type SemrushReportParseResult =
  | { status: "ok"; header: string[]; rows: string[][] }
  | { status: "not_found"; code: string; message: string }
  | { status: "error"; code: string; message: string };

/** Export columns (owner + customer sheet). Stable order — append only. */
export const SEMRUSH_EXPORT_COLUMNS = [
  "date",
  "window_from",
  "window_to",
  "domain",
  "database_code",
  "report_type",
  "entity_type",
  "keyword",
  "page_url",
  "metric",
  "value",
  "availability",
  "confidence",
  "is_estimate",
  "source",
  "fetched_at",
] as const;

export const SEMRUSH_EXPORT_TAB = "semrush_evidence" as const;
