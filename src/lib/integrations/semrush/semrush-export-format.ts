/**
 * SEMrush export formatting — pure (no prisma), shared by owner and customer
 * exports and unit tests.
 */
import {
  SEMRUSH_EXPORT_COLUMNS,
  SEMRUSH_EXPORT_TAB,
  type SemrushEvidenceRow,
} from "./semrush-evidence-contract";

export type SemrushExportDataset = {
  title: typeof SEMRUSH_EXPORT_TAB;
  header: string[];
  rows: string[][];
  snapshotDate: string;
  rowCount: number;
};

export function semrushRowToExportCells(row: SemrushEvidenceRow): string[] {
  const byColumn: Record<(typeof SEMRUSH_EXPORT_COLUMNS)[number], string> = {
    date: row.date,
    window_from: row.windowFrom,
    window_to: row.windowTo,
    domain: row.domain,
    database_code: row.databaseCode,
    report_type: row.reportType,
    entity_type: row.entityType,
    keyword: row.keyword ?? "",
    page_url: row.pageUrl ?? "",
    metric: row.metric,
    value: row.value == null ? "" : String(row.value),
    availability: row.availability,
    confidence: row.confidence,
    is_estimate: row.isEstimate ? "true" : "false",
    source: row.source,
    fetched_at: row.fetchedAt,
  };

  return SEMRUSH_EXPORT_COLUMNS.map((column) => byColumn[column]);
}

/** Pure: build the dataset from already-loaded rows (null when empty). */
export function buildSemrushExportDataset(
  rows: SemrushEvidenceRow[],
  options: { prefix?: Record<string, string> } = {},
): SemrushExportDataset | null {
  if (rows.length === 0) return null;

  const prefixKeys = Object.keys(options.prefix ?? {});
  const prefixValues = prefixKeys.map((key) => options.prefix?.[key] ?? "");

  return {
    title: SEMRUSH_EXPORT_TAB,
    header: [...prefixKeys, ...SEMRUSH_EXPORT_COLUMNS],
    rows: rows.map((row) => [...prefixValues, ...semrushRowToExportCells(row)]),
    snapshotDate: rows[0]?.date ?? "",
    rowCount: rows.length,
  };
}

export type SemrushExportStatus =
  | { status: "written"; tab: string; rows: number; snapshotDate: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };
