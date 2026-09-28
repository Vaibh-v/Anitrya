/**
 * Anitrya market-trends directory: seasonality for every search topic across
 * all connected businesses, built from the monthly Search Console history and
 * written to the founder master sheet (tab market_trends). No customer or
 * project names are written — only the query and how demand moves by month.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { OWNER_MASTER_SPREADSHEET_ID } from "@/lib/intelligence/owner-network/constants";
import { clearAndWriteSheet, ensureTabsExist } from "@/lib/intelligence/owner-network/google-sheets";
import { ownerSheetsAuthMode } from "@/lib/intelligence/owner-network/owner-auth";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TAB = "market_trends";

export type TrendRow = { query: string; businesses: number; total: number; byMonth: number[] };

/** Peak and low month, and how peaky the topic is (peak ÷ monthly average). */
export function describeTrend(byMonth: number[]) {
  const seen = byMonth.filter((v) => v > 0);
  const avg = seen.length ? seen.reduce((t, v) => t + v, 0) / seen.length : 0;
  let peak = 0;
  let low = -1;
  byMonth.forEach((v, i) => {
    if (v > byMonth[peak]) peak = i;
    if (v > 0 && (low < 0 || v < byMonth[low])) low = i;
  });
  return { peak: MONTHS[peak], low: low >= 0 ? MONTHS[low] : "—", seasonality: avg ? Math.round((byMonth[peak] / avg) * 100) / 100 : 0, monthsSeen: seen.length };
}

export async function buildMarketTrends(limit = 3000): Promise<TrendRow[]> {
  await ensureAdditiveSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ query: string; businesses: bigint; total: bigint; m: Array<number | null> }>>(
    `WITH per AS (
       SELECT lower(query) AS query, workspace_id || '/' || project_slug AS biz, substr(month, 6, 2)::int AS mon, SUM(impressions) AS impr
       FROM gsc_query_monthly GROUP BY 1, 2, 3
     )
     SELECT query, COUNT(DISTINCT biz)::bigint AS businesses, SUM(impr)::bigint AS total,
            ARRAY(SELECT COALESCE(SUM(p2.impr), 0)::float FROM generate_series(1, 12) g(mon) LEFT JOIN per p2 ON p2.query = per.query AND p2.mon = g.mon GROUP BY g.mon ORDER BY g.mon) AS m
     FROM per GROUP BY query HAVING SUM(impr) >= 200 ORDER BY total DESC LIMIT ${Math.max(100, Math.min(10000, limit))}`,
  );
  return rows.map((r) => ({ query: r.query, businesses: Number(r.businesses), total: Number(r.total), byMonth: (r.m ?? []).map((v) => Number(v ?? 0)) }));
}

/** Rewrites the master sheet tab. Safe to run daily; skips quietly without sheet access. */
export async function exportMarketTrends() {
  if (!(await ownerSheetsAuthMode())) return { written: 0, skipped: "no sheet access" };
  const trends = await buildMarketTrends();
  const header = ["query", "businesses", "impressions_16m", "peak_month", "low_month", "seasonality", "months_with_data", ...MONTHS.map((m) => m.toLowerCase())];
  const body = trends.map((t) => {
    const d = describeTrend(t.byMonth);
    return [t.query, String(t.businesses), String(t.total), d.peak, d.low, String(d.seasonality), String(d.monthsSeen), ...t.byMonth.map((v) => String(Math.round(v)))];
  });
  await ensureTabsExist(OWNER_MASTER_SPREADSHEET_ID, [TAB]);
  await clearAndWriteSheet(OWNER_MASTER_SPREADSHEET_ID, TAB, [header, ...body]);
  return { written: body.length, skipped: null };
}
