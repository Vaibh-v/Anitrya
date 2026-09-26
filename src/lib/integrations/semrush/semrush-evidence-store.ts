/**
 * SEMrush evidence storage — table guard, idempotent snapshot replace, and
 * project-scoped reads. Raw SQL, mirroring the google_ads_campaign_daily /
 * gbp_location_daily pattern. Kept separate from
 * ensureNormalizedEvidenceTables() so a SEMrush storage failure can never
 * block GA4/GSC/GBP/Ads sync.
 */
import { prisma } from "@/lib/prisma";
import {
  SEMRUSH_EVIDENCE_TABLE,
  type SemrushAvailability,
  type SemrushConfidence,
  type SemrushEntityType,
  type SemrushEvidenceRow,
  type SemrushMetric,
  type SemrushReportType,
} from "@/lib/integrations/semrush/semrush-evidence-contract";

const INSERT_CHUNK_SIZE = 500;
const DEFAULT_READ_LIMIT = 5000;

const INSERT_COLUMNS = [
  "workspace_id",
  "project_slug",
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
  "source",
  "source_version",
  "availability",
  "confidence",
  "is_estimate",
  "fetched_at",
] as const;

const DATE_COLUMNS = new Set(["date", "window_from", "window_to"]);

export async function semrushEvidenceTableExists(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${SEMRUSH_EVIDENCE_TABLE}
      ) AS exists
    `;
    return Boolean(result?.[0]?.exists);
  } catch {
    return false;
  }
}

/** Idempotent. Matches prisma/migrations/20260923120000_add_semrush_evidence_snapshot. */
export async function ensureSemrushEvidenceTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS semrush_evidence_snapshot (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date DATE NOT NULL,
      window_from DATE NOT NULL,
      window_to DATE NOT NULL,
      domain TEXT NOT NULL,
      database_code TEXT NOT NULL,
      report_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      keyword TEXT,
      page_url TEXT,
      metric TEXT NOT NULL,
      value DOUBLE PRECISION,
      source TEXT NOT NULL DEFAULT 'semrush',
      source_version TEXT NOT NULL DEFAULT 'analytics_v3',
      availability TEXT NOT NULL DEFAULT 'available',
      confidence TEXT NOT NULL DEFAULT 'medium',
      is_estimate BOOLEAN NOT NULL DEFAULT true,
      fetched_at TIMESTAMP(6) NOT NULL DEFAULT now(),
      created_at TIMESTAMP(6) DEFAULT now()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_semrush_evidence_snapshot_workspace_project_date
    ON semrush_evidence_snapshot (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_semrush_evidence_snapshot_workspace_project_domain_date
    ON semrush_evidence_snapshot (workspace_id, project_slug, domain, database_code, date);
  `);
}

export async function countSemrushSnapshotRows(input: {
  workspaceId: string;
  projectSlug: string;
  domain: string;
  databaseCode: string;
  date: string;
}): Promise<number> {
  if (!(await semrushEvidenceTableExists())) return 0;

  const result = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM semrush_evidence_snapshot
    WHERE workspace_id = ${input.workspaceId}
      AND project_slug = ${input.projectSlug}
      AND domain = ${input.domain}
      AND database_code = ${input.databaseCode}
      AND date = CAST(${input.date} AS DATE)
  `;

  return Number(result?.[0]?.count ?? 0);
}

function rowValues(row: SemrushEvidenceRow): unknown[] {
  return [
    row.workspaceId,
    row.projectSlug,
    row.date,
    row.windowFrom,
    row.windowTo,
    row.domain,
    row.databaseCode,
    row.reportType,
    row.entityType,
    row.keyword,
    row.pageUrl,
    row.metric,
    row.value,
    row.source,
    row.sourceVersion,
    row.availability,
    row.confidence,
    row.isEstimate,
    row.fetchedAt,
  ];
}

/** Pure: parameterized multi-row INSERT for one chunk (exported for SQL tests). */
export function buildSemrushInsertStatement(rows: SemrushEvidenceRow[]): {
  sql: string;
  params: unknown[];
} {
  const columnSql = INSERT_COLUMNS.map((column) => `"${column}"`).join(", ");
  const params: unknown[] = [];

  const tuples = rows.map((row) => {
    const placeholders = rowValues(row).map((value, index) => {
      params.push(value);
      const column = INSERT_COLUMNS[index];
      const ref = `$${params.length}`;
      if (DATE_COLUMNS.has(column)) return `CAST(${ref} AS DATE)`;
      if (column === "fetched_at") return `CAST(${ref} AS TIMESTAMP)`;
      if (column === "value") return `CAST(${ref} AS DOUBLE PRECISION)`;
      if (column === "is_estimate") return `CAST(${ref} AS BOOLEAN)`;
      return ref;
    });
    return `(${placeholders.join(", ")})`;
  });

  return {
    sql: `INSERT INTO semrush_evidence_snapshot (${columnSql}) VALUES ${tuples.join(", ")}`,
    params,
  };
}

/**
 * Replace the snapshot for (workspace, project, domain, database, date) with
 * `rows` in one transaction, so re-running a sync on the same day is
 * idempotent and never duplicates evidence.
 */
export async function replaceSemrushSnapshot(input: {
  workspaceId: string;
  projectSlug: string;
  domain: string;
  databaseCode: string;
  date: string;
  rows: SemrushEvidenceRow[];
}): Promise<number> {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        DELETE FROM semrush_evidence_snapshot
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectSlug}
          AND domain = ${input.domain}
          AND database_code = ${input.databaseCode}
          AND date = CAST(${input.date} AS DATE)
      `;

      for (let start = 0; start < input.rows.length; start += INSERT_CHUNK_SIZE) {
        const statement = buildSemrushInsertStatement(
          input.rows.slice(start, start + INSERT_CHUNK_SIZE),
        );
        await tx.$executeRawUnsafe(statement.sql, ...statement.params);
      }
    },
    { timeout: 30_000, maxWait: 10_000 },
  );

  return input.rows.length;
}

type StoredRow = {
  workspace_id: string;
  project_slug: string;
  date: string;
  window_from: string;
  window_to: string;
  domain: string;
  database_code: string;
  report_type: string;
  entity_type: string;
  keyword: string | null;
  page_url: string | null;
  metric: string;
  value: number | null;
  source_version: string;
  availability: string;
  confidence: string;
  is_estimate: boolean;
  fetched_at: string;
};

/**
 * Latest SEMrush snapshot relevant to [from, to] for one project: a snapshot
 * is relevant when its snapshot date is inside the window, or when the sync
 * window that produced it overlaps the requested window.
 *
 * Never throws: returns [] if the table is missing or the query fails, so
 * callers (export, intelligence) degrade to "no SEMrush evidence".
 */
export async function readLatestSemrushEvidence(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  limit?: number;
}): Promise<SemrushEvidenceRow[]> {
  try {
    if (!(await semrushEvidenceTableExists())) return [];

    const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_READ_LIMIT, 20_000));

    const rows = await prisma.$queryRaw<StoredRow[]>`
      WITH latest AS (
        SELECT MAX(date) AS date
        FROM semrush_evidence_snapshot
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectSlug}
          AND (
            (date >= CAST(${input.from} AS DATE) AND date <= CAST(${input.to} AS DATE))
            OR (window_from <= CAST(${input.to} AS DATE) AND window_to >= CAST(${input.from} AS DATE))
          )
      )
      SELECT
        s.workspace_id, s.project_slug,
        s.date::text AS date, s.window_from::text AS window_from, s.window_to::text AS window_to,
        s.domain, s.database_code, s.report_type, s.entity_type, s.keyword, s.page_url,
        s.metric, s.value, s.source_version, s.availability, s.confidence, s.is_estimate,
        to_char(s.fetched_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at
      FROM semrush_evidence_snapshot s
      JOIN latest ON s.date = latest.date
      WHERE s.workspace_id = ${input.workspaceId}
        AND s.project_slug = ${input.projectSlug}
      ORDER BY s.report_type ASC, s.entity_type ASC, s.keyword ASC NULLS FIRST, s.metric ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      workspaceId: row.workspace_id,
      projectSlug: row.project_slug,
      date: row.date,
      windowFrom: row.window_from,
      windowTo: row.window_to,
      domain: row.domain,
      databaseCode: row.database_code,
      reportType: row.report_type as SemrushReportType,
      entityType: row.entity_type as SemrushEntityType,
      keyword: row.keyword,
      pageUrl: row.page_url,
      metric: row.metric as SemrushMetric,
      value: row.value == null ? null : Number(row.value),
      source: "semrush",
      sourceVersion: "analytics_v3",
      availability: row.availability as SemrushAvailability,
      confidence: row.confidence as SemrushConfidence,
      isEstimate: Boolean(row.is_estimate),
      fetchedAt: row.fetched_at,
    }));
  } catch (error) {
    console.error("SEMRUSH_EVIDENCE_READ_FAILED", error instanceof Error ? error.message : error);
    return [];
  }
}
