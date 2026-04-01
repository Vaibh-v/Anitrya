export type SyncSourceKey =
  | "google_ga4"
  | "google_gsc"
  | "google_business_profile"
  | "google_ads"
  | "google_trends";

export type SyncExecutionState =
  | "idle"
  | "running"
  | "success"
  | "failed";

export type SyncJobRequest = {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  sources: SyncSourceKey[];
};

export type SyncSourceResult = {
  source: SyncSourceKey;
  status: Exclude<SyncExecutionState, "idle" | "running">;
  rowsProcessed: number;
  startedAt: string;
  endedAt: string;
  message: string;
};

export type SyncRunRecord = {
  id: string;
  workspaceId: string;
  projectSlug: string;
  state: SyncExecutionState;
  from: string;
  to: string;
  sources: SyncSourceKey[];
  startedAt: string;
  endedAt: string | null;
  sourceResults: SyncSourceResult[];
  totalRowsProcessed: number;
  message: string;
};

export type SyncStatusSummary = {
  currentState: SyncExecutionState;
  latestRun: SyncRunRecord | null;
  recentRuns: SyncRunRecord[];
};

export const DEFAULT_SYNC_SOURCES: SyncSourceKey[] = [
  "google_ga4",
  "google_gsc",
];

export function sourceDisplayLabel(source: SyncSourceKey): string {
  switch (source) {
    case "google_ga4":
      return "Google Analytics 4";
    case "google_gsc":
      return "Google Search Console";
    case "google_business_profile":
      return "Google Business Profile";
    case "google_ads":
      return "Google Ads";
    case "google_trends":
      return "Google Trends";
    default:
      return source;
  }
}