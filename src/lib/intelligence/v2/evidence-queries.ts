/**
 * Aggregate evidence for the v2 intelligence engine. Every query runs in the
 * database (GROUP BY + CASE per window), so even a 200k-row property returns a
 * few thousand summary rows. The previous window has the same length as the
 * selected one and ends the day before it starts.
 */
import { prisma } from "@/lib/prisma";

import { buildWindow, type Window } from "@/lib/intelligence/v2/window";

export { buildWindow, type Window };

export type SourceAgg = { label: string; cur: number; prev: number; curEngaged: number; curConv: number; prevConv: number };
export type LandingAgg = { label: string; cur: number; prev: number; curEngaged: number; curConv: number };
export type QueryAgg = { label: string; curClicks: number; curImpr: number; curPos: number; prevClicks: number; prevImpr: number; prevPos: number };
export type DailyAgg = { date: string; value: number };

export type EvidenceAggregates = {
  window: Window;
  sources: SourceAgg[];
  landings: LandingAgg[];
  queries: QueryAgg[];
  pages: QueryAgg[];
  dailySessions: DailyAgg[];
  dailyClicks: DailyAgg[];
  coverage: { ga4CurDays: number; ga4PrevDays: number; gscCurDays: number; gscPrevDays: number };
};

const SCOPE = `workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) >= $5 AND CAST(date AS TEXT) <= $4`;
const CUR = `CAST(date AS TEXT) >= $3`;

function n(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function q(sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
  try {
    return await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);
  } catch (error) {
    console.warn("INTEL_V2_QUERY_FAILED", error instanceof Error ? error.message.slice(0, 200) : error);
    return [];
  }
}

export async function loadEvidenceAggregates(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}): Promise<EvidenceAggregates> {
  const window = buildWindow(input.from, input.to);
  const params = [input.workspaceId, input.projectSlug, window.from, window.to, window.prevFrom];

  const [sources, landings, queries, pages, dailySessions, dailyClicks, coverage] = await Promise.all([
    q(
      `SELECT COALESCE(NULLIF(source,''),'(direct)') || COALESCE(' / ' || NULLIF(medium,''),'') AS label,
              SUM(CASE WHEN ${CUR} THEN sessions ELSE 0 END) AS cur,
              SUM(CASE WHEN ${CUR} THEN 0 ELSE sessions END) AS prev,
              SUM(CASE WHEN ${CUR} THEN COALESCE(engaged_sessions,0) ELSE 0 END) AS cur_engaged,
              SUM(CASE WHEN ${CUR} THEN COALESCE(conversions,0) ELSE 0 END) AS cur_conv,
              SUM(CASE WHEN ${CUR} THEN 0 ELSE COALESCE(conversions,0) END) AS prev_conv
       FROM ga4_source_daily WHERE ${SCOPE} GROUP BY 1 ORDER BY 2 DESC NULLS LAST LIMIT 200`,
      params,
    ),
    q(
      `SELECT landing_page AS label,
              SUM(CASE WHEN ${CUR} THEN sessions ELSE 0 END) AS cur,
              SUM(CASE WHEN ${CUR} THEN 0 ELSE sessions END) AS prev,
              SUM(CASE WHEN ${CUR} THEN COALESCE(engaged_sessions,0) ELSE 0 END) AS cur_engaged,
              SUM(CASE WHEN ${CUR} THEN COALESCE(conversions,0) ELSE 0 END) AS cur_conv
       FROM ga4_landing_page_daily WHERE ${SCOPE} AND landing_page IS NOT NULL
       GROUP BY 1 ORDER BY 2 DESC NULLS LAST LIMIT 500`,
      params,
    ),
    q(searchSql("gsc_query_daily", "query", 3000), params),
    q(searchSql("gsc_page_daily", "page", 1500), params),
    q(
      `SELECT CAST(date AS TEXT) AS d, SUM(sessions) AS v FROM ga4_source_daily
       WHERE workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) >= $3 AND CAST(date AS TEXT) <= $4 AND $5::text IS NOT NULL
       GROUP BY 1 ORDER BY 1`,
      params,
    ),
    q(
      `SELECT CAST(date AS TEXT) AS d, SUM(clicks) AS v FROM gsc_page_daily
       WHERE workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) >= $3 AND CAST(date AS TEXT) <= $4 AND $5::text IS NOT NULL
       GROUP BY 1 ORDER BY 1`,
      params,
    ),
    q(
      `SELECT
         (SELECT COUNT(DISTINCT CAST(date AS TEXT)) FROM ga4_source_daily WHERE ${SCOPE} AND ${CUR}) AS ga4_cur,
         (SELECT COUNT(DISTINCT CAST(date AS TEXT)) FROM ga4_source_daily WHERE ${SCOPE} AND NOT (${CUR})) AS ga4_prev,
         (SELECT COUNT(DISTINCT CAST(date AS TEXT)) FROM gsc_page_daily WHERE ${SCOPE} AND ${CUR}) AS gsc_cur,
         (SELECT COUNT(DISTINCT CAST(date AS TEXT)) FROM gsc_page_daily WHERE ${SCOPE} AND NOT (${CUR})) AS gsc_prev`,
      params,
    ),
  ]);

  const c = coverage[0] ?? {};
  return {
    window,
    sources: sources.map((r) => ({
      label: String(r.label ?? "(not set)"),
      cur: n(r.cur),
      prev: n(r.prev),
      curEngaged: n(r.cur_engaged),
      curConv: n(r.cur_conv),
      prevConv: n(r.prev_conv),
    })),
    landings: landings.map((r) => ({
      label: String(r.label ?? ""),
      cur: n(r.cur),
      prev: n(r.prev),
      curEngaged: n(r.cur_engaged),
      curConv: n(r.cur_conv),
    })),
    queries: queries.map(toSearch),
    pages: pages.map(toSearch),
    dailySessions: dailySessions.map((r) => ({ date: String(r.d), value: n(r.v) })),
    dailyClicks: dailyClicks.map((r) => ({ date: String(r.d), value: n(r.v) })),
    coverage: {
      ga4CurDays: n(c.ga4_cur),
      ga4PrevDays: n(c.ga4_prev),
      gscCurDays: n(c.gsc_cur),
      gscPrevDays: n(c.gsc_prev),
    },
  };
}

function searchSql(table: string, column: string, limit: number) {
  return `SELECT ${column} AS label,
            SUM(CASE WHEN ${CUR} THEN clicks ELSE 0 END) AS cur_clicks,
            SUM(CASE WHEN ${CUR} THEN impressions ELSE 0 END) AS cur_impr,
            SUM(CASE WHEN ${CUR} THEN position * impressions ELSE 0 END) AS cur_pos_w,
            SUM(CASE WHEN ${CUR} THEN 0 ELSE clicks END) AS prev_clicks,
            SUM(CASE WHEN ${CUR} THEN 0 ELSE impressions END) AS prev_impr,
            SUM(CASE WHEN ${CUR} THEN 0 ELSE position * impressions END) AS prev_pos_w
          FROM ${table} WHERE ${SCOPE} AND ${column} IS NOT NULL AND ${column} <> ''
          GROUP BY 1
          ORDER BY SUM(CASE WHEN ${CUR} THEN impressions ELSE 0 END) + SUM(CASE WHEN ${CUR} THEN 0 ELSE impressions END) DESC NULLS LAST
          LIMIT ${limit}`;
}

function toSearch(r: Record<string, unknown>): QueryAgg {
  const curImpr = n(r.cur_impr);
  const prevImpr = n(r.prev_impr);
  return {
    label: String(r.label ?? ""),
    curClicks: n(r.cur_clicks),
    curImpr,
    curPos: curImpr > 0 ? n(r.cur_pos_w) / curImpr : 0,
    prevClicks: n(r.prev_clicks),
    prevImpr,
    prevPos: prevImpr > 0 ? n(r.prev_pos_w) / prevImpr : 0,
  };
}
