/**
 * Which normalized evidence tables are mirrored into customer workbooks, and
 * how a DB row becomes a sheet row. Pure (no prisma) so it is unit-testable.
 */

export type EvidenceTableSpec = {
  /** Sheet tab name (matches CUSTOMER_TABS). */
  tab: string;
  /** Postgres table name. */
  table: string;
  /** Evidence columns, in sheet order. Missing DB columns export as "". */
  columns: string[];
  /** ORDER BY columns (only those that exist are used). */
  orderBy: string[];
};

export const EVIDENCE_TABLE_SPECS: EvidenceTableSpec[] = [
  {
    tab: "ga4_source_daily",
    table: "ga4_source_daily",
    columns: ["date", "source", "medium", "sessions", "users", "engaged_sessions", "conversions"],
    orderBy: ["date", "source"],
  },
  {
    tab: "ga4_landing_page_daily",
    table: "ga4_landing_page_daily",
    columns: ["date", "landing_page", "page_path", "sessions", "users", "engaged_sessions", "conversions"],
    orderBy: ["date", "landing_page"],
  },
  {
    tab: "gsc_query_daily",
    table: "gsc_query_daily",
    columns: ["date", "query", "clicks", "impressions", "ctr", "position"],
    orderBy: ["date", "query"],
  },
  {
    tab: "gsc_page_daily",
    table: "gsc_page_daily",
    columns: ["date", "page", "clicks", "impressions", "ctr", "position"],
    orderBy: ["date", "page"],
  },
  {
    tab: "google_ads_campaign_daily",
    table: "google_ads_campaign_daily",
    columns: [
      "date",
      "customer_id",
      "campaign_id",
      "campaign_name",
      "campaign_status",
      "channel_type",
      "impressions",
      "clicks",
      "cost_micros",
      "conversions",
      "ctr",
      "average_cpc_micros",
    ],
    orderBy: ["date", "campaign_id"],
  },
  {
    tab: "gbp_location_daily",
    table: "gbp_location_daily",
    columns: ["date", "location_name", "location_label", "account_name", "metric", "value"],
    orderBy: ["date", "metric"],
  },
];

export const DEFAULT_MAX_ROWS_PER_TAB = 10_000;
export const MAX_ROWS_PER_TAB_ENV = "OWNER_EXPORT_MAX_ROWS_PER_TAB";

export function resolveMaxRowsPerTab(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_ROWS_PER_TAB;
  return Math.min(parsed, 50_000);
}

export function formatCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

/**
 * Map one DB row onto a sheet header. Header cells are either identity
 * columns supplied in `identity` (workspace_id, project_id, ...), `synced_at`,
 * or DB columns by the same name.
 */
export function toSheetRow(
  header: string[],
  dbRow: Record<string, unknown>,
  identity: Record<string, string>,
  syncedAt: string,
): string[] {
  return header.map((column) => {
    if (column in identity) return identity[column] ?? "";
    if (column === "synced_at") return syncedAt;
    return formatCell(dbRow[column]);
  });
}

/**
 * Replace one project's rows in an existing tab while keeping every other
 * project's rows. Uses the existing header when present so manual column
 * additions in the sheet are not destroyed; falls back to `header`.
 */
export function mergeProjectRows(input: {
  existing: string[][];
  header: string[];
  workspaceId: string;
  projectSlug: string;
  nextRows: string[][];
}): string[][] {
  const existingHeader = input.existing[0] ?? [];
  const sameHeader =
    existingHeader.length === input.header.length &&
    existingHeader.every((cell, index) => cell === input.header[index]);

  // If the tab's header changed shape, rows from other projects cannot be
  // realigned safely — start the tab over with the canonical header.
  const retained = sameHeader
    ? input.existing.slice(1).filter((row) => {
        const workspaceIndex = input.header.indexOf("workspace_id");
        const projectIndex = input.header.indexOf("project_slug");
        if (workspaceIndex < 0 || projectIndex < 0) return false;
        return !(
          (row[workspaceIndex] ?? "") === input.workspaceId &&
          (row[projectIndex] ?? "") === input.projectSlug
        );
      })
    : [];

  return [input.header, ...retained, ...input.nextRows];
}
