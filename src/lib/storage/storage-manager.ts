/**
 * Database storage policy.
 *
 * Lean (free database plan, default): full detail for the last 180 days —
 * everything the dashboard and intelligence read. For older months, every row
 * is first archived to the customer's Google Sheet (month tabs), then only the
 * Search Console long tail (0 clicks and ≤ 2 impressions) is removed from the
 * database. Nothing is lost: the sheet keeps every archived row.
 *
 * Full (paid database plan): nothing is ever trimmed. Switching is one click in
 * Settings → Health; the choice is stored in the founder master sheet so it
 * works even when the database itself is full.
 */
import { prisma } from "@/lib/prisma";
import { OWNER_MASTER_SPREADSHEET_ID } from "@/lib/intelligence/owner-network/constants";
import {
  appendRows,
  ensureSheetStructure,
  readSheetValues,
  upsertRowByKey,
} from "@/lib/intelligence/owner-network/google-sheets";
import { ensureOwnerCustomerSheet } from "@/lib/intelligence/owner-network/customer-sheet-network";
import { mirrorProjectEvidence } from "@/lib/intelligence/owner-network/export-normalized-project-data";

export type StorageMode = "lean" | "full";

const SETTINGS_TAB = "settings";
const SETTINGS_HEADERS = ["key", "value", "updated_at"];
const ARCHIVE_TAB = "storage_archive";
const ARCHIVE_HEADERS = ["workspace_id", "project_slug", "month", "archived_at", "customer_sheet_id"];
const HOT_DAYS = 180;
const LONG_TAIL_TABLES = ["gsc_query_daily", "gsc_page_daily"] as const;

let modeCache: { mode: StorageMode; at: number } | null = null;

export function dbLimitMb() {
  const parsed = Number.parseInt(process.env.ANITRYA_DB_LIMIT_MB ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 512;
}

export async function getStorageMode(): Promise<StorageMode> {
  const forced = process.env.ANITRYA_STORAGE_MODE?.trim();
  if (forced === "lean" || forced === "full") return forced;
  if (modeCache && Date.now() - modeCache.at < 5 * 60_000) return modeCache.mode;
  try {
    const rows = await readSheetValues(OWNER_MASTER_SPREADSHEET_ID, SETTINGS_TAB);
    const row = rows.slice(1).find((r) => r[0] === "storage_mode");
    const mode: StorageMode = row?.[1] === "full" ? "full" : "lean";
    modeCache = { mode, at: Date.now() };
    return mode;
  } catch {
    return modeCache?.mode ?? "lean";
  }
}

export async function setStorageMode(mode: StorageMode) {
  await upsertRowByKey({
    spreadsheetId: OWNER_MASTER_SPREADSHEET_ID,
    tabName: SETTINGS_TAB,
    headers: SETTINGS_HEADERS,
    keyHeader: "key",
    row: { key: "storage_mode", value: mode, updated_at: new Date().toISOString() },
  });
  modeCache = { mode, at: Date.now() };
}

export async function getDbUsageMb(): Promise<number | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ bytes: bigint | number }>>(
      "SELECT pg_database_size(current_database()) AS bytes",
    );
    return Math.round(Number(rows[0]?.bytes ?? 0) / 1024 / 1024);
  } catch {
    return null;
  }
}

export async function getStorageStatus() {
  const [mode, usedMb] = await Promise.all([getStorageMode(), getDbUsageMb()]);
  return { mode, usedMb, limitMb: mode === "lean" ? dbLimitMb() : null };
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function archivedMonths(): Promise<Set<string>> {
  await ensureSheetStructure(OWNER_MASTER_SPREADSHEET_ID, { [ARCHIVE_TAB]: ARCHIVE_HEADERS });
  const rows = await readSheetValues(OWNER_MASTER_SPREADSHEET_ID, ARCHIVE_TAB);
  return new Set(rows.slice(1).map((r) => `${r[0]}|${r[1]}|${r[2]}`));
}

/** Months (YYYY_MM) strictly older than the hot window that still hold long-tail rows. */
async function coldMonthsWithLongTail(workspaceId: string, projectSlug: string, cutoff: string): Promise<string[]> {
  const months = new Set<string>();
  for (const table of LONG_TAIL_TABLES) {
    const rows = await prisma
      .$queryRawUnsafe<Array<{ m: string }>>(
        `SELECT DISTINCT substr(CAST(date AS TEXT), 1, 7) AS m FROM ${table}
         WHERE workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) < $3
           AND COALESCE(clicks, 0) = 0 AND COALESCE(impressions, 0) <= 2`,
        workspaceId,
        projectSlug,
        cutoff,
      )
      .catch(() => []);
    rows.forEach((r) => months.add(r.m));
  }
  // Only whole months that ended before the hot window starts.
  return [...months].filter((m) => m < cutoff.slice(0, 7)).sort();
}

export type MaintenanceReport = {
  mode: StorageMode;
  archived: string[];
  deletedRows: number;
  reclaimed: boolean;
  usedMbBefore: number | null;
  usedMbAfter: number | null;
  stoppedEarly: boolean;
};

/**
 * Archive → trim → reclaim, within a time budget. Safe to run repeatedly; it
 * continues where it stopped (progress lives in the master sheet).
 */
export async function runStorageMaintenance(options: { budgetMs?: number; forceReclaim?: boolean } = {}): Promise<MaintenanceReport> {
  const started = Date.now();
  const budget = options.budgetMs ?? 200_000;
  const mode = await getStorageMode();
  const usedMbBefore = await getDbUsageMb();
  const report: MaintenanceReport = { mode, archived: [], deletedRows: 0, reclaimed: false, usedMbBefore, usedMbAfter: usedMbBefore, stoppedEarly: false };
  if (mode === "full") return report;

  const cutoff = isoDaysAgo(HOT_DAYS);
  const done = await archivedMonths();
  const projects = await prisma.project.findMany({ select: { workspaceId: true, slug: true, id: true, name: true } });

  for (const project of projects) {
    const months = await coldMonthsWithLongTail(project.workspaceId, project.slug, cutoff);
    if (months.length === 0) continue;
    const network = await ensureOwnerCustomerSheet(project.workspaceId);

    for (const month of months) {
      if (Date.now() - started > budget) {
        report.stoppedEarly = true;
        break;
      }
      const key = `${project.workspaceId}|${project.slug}|${month.replace("-", "_")}`;
      if (!done.has(key)) {
        const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
        const result = await mirrorProjectEvidence({
          customerSpreadsheetId: network.customerSpreadsheetId,
          workspaceId: project.workspaceId,
          projectId: project.id,
          projectSlug: project.slug,
          projectLabel: project.name,
          from: `${month}-01`,
          to: lastDay,
          syncedAt: new Date().toISOString(),
        });
        // Only trim what was archived successfully and completely.
        if (result.status !== "written" || result.tabs.some((tab) => tab.truncated)) continue;
        await appendRows(OWNER_MASTER_SPREADSHEET_ID, ARCHIVE_TAB, [
          [project.workspaceId, project.slug, month.replace("-", "_"), new Date().toISOString(), network.customerSpreadsheetId],
        ]);
        report.archived.push(`${project.slug} ${month}`);
      }
      for (const table of LONG_TAIL_TABLES) {
        const deleted = await prisma
          .$executeRawUnsafe(
            `DELETE FROM ${table}
             WHERE workspace_id = $1 AND project_slug = $2
               AND substr(CAST(date AS TEXT), 1, 7) = $3
               AND COALESCE(clicks, 0) = 0 AND COALESCE(impressions, 0) <= 2`,
            project.workspaceId,
            project.slug,
            month,
          )
          .catch((error) => {
            console.error("STORAGE_TRIM_FAILED", table, error instanceof Error ? error.message : error);
            return 0;
          });
        report.deletedRows += deleted;
      }
    }
    if (report.stoppedEarly) break;
  }

  const used = await getDbUsageMb();
  if (options.forceReclaim || report.deletedRows > 0 || (used ?? 0) > dbLimitMb() * 0.8) {
    report.reclaimed = await reclaimSpace((used ?? 0) > dbLimitMb() * 0.8 || Boolean(options.forceReclaim));
  }
  report.usedMbAfter = await getDbUsageMb();
  return report;
}

/**
 * Plain VACUUM lets trimmed tables reuse their space. When the database is
 * near its limit, a full rewrite shrinks the files so other tables can grow;
 * secondary indexes are dropped first (to leave room for the rewrite) and
 * recreated from their exact definitions afterwards.
 */
export async function reclaimSpace(full: boolean): Promise<boolean> {
  try {
    for (const table of ["gsc_page_daily", "gsc_query_daily"]) {
      if (!full) {
        await prisma.$executeRawUnsafe(`VACUUM (ANALYZE) ${table}`);
        continue;
      }
      const indexes = await prisma.$queryRawUnsafe<Array<{ name: string; def: string }>>(
        `SELECT i.relname AS name, pg_get_indexdef(i.oid) AS def
         FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
         WHERE t.relname = $1 AND NOT x.indisprimary AND NOT x.indisunique`,
        table,
      );
      for (const index of indexes) await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${index.name}"`);
      try {
        await prisma.$executeRawUnsafe(`VACUUM (FULL, ANALYZE) ${table}`);
      } finally {
        // Always restore the indexes, even if the rewrite failed.
        for (const index of indexes) await prisma.$executeRawUnsafe(index.def.replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS "));
      }
    }
    return true;
  } catch (error) {
    console.error("STORAGE_RECLAIM_FAILED", error instanceof Error ? error.message : error);
    return false;
  }
}
