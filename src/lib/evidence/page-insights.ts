/**
 * Read-only aggregates for the SEO and Behavior pages. Every query is
 * project-scoped and parameterized, and tolerates tables whose `date` column
 * is DATE (migrations) or TEXT (older ensure-table SQL). Failures return an
 * empty result so a page never crashes on a missing table.
 */
import { prisma } from "@/lib/prisma";

type Scope = { workspaceId: string; projectSlug: string; from: string; to: string };

export type RankedRow = { label: string; primary: number; secondary: number; tertiary?: number; quaternary?: number };

const WHERE = `workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) >= $3 AND CAST(date AS TEXT) <= $4`;

function num(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function safeQuery<T>(sql: string, scope: Scope): Promise<T[]> {
  try {
    return await prisma.$queryRawUnsafe<T[]>(sql, scope.workspaceId, scope.projectSlug, scope.from, scope.to);
  } catch (error) {
    console.warn("PAGE_INSIGHTS_QUERY_FAILED", error instanceof Error ? error.message : error);
    return [];
  }
}

export type SeoDetail = {
  queryRows: number;
  pageRows: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: RankedRow[];
  topPages: RankedRow[];
};

export async function getSeoDetail(scope: Scope): Promise<SeoDetail> {
  const [totals, pageCount, queries, pages] = await Promise.all([
    safeQuery<Record<string, unknown>>(
      `SELECT COUNT(*)::bigint AS rows, COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(impressions),0) AS impressions,
              COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions),0), 0) AS position
       FROM gsc_query_daily WHERE ${WHERE}`,
      scope,
    ),
    safeQuery<Record<string, unknown>>(`SELECT COUNT(*)::bigint AS rows FROM gsc_page_daily WHERE ${WHERE}`, scope),
    safeQuery<Record<string, unknown>>(
      `SELECT query AS label, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
              SUM(position * impressions) / NULLIF(SUM(impressions),0) AS position
       FROM gsc_query_daily WHERE ${WHERE} AND query IS NOT NULL
       GROUP BY query ORDER BY SUM(clicks) DESC NULLS LAST, SUM(impressions) DESC NULLS LAST LIMIT 10`,
      scope,
    ),
    safeQuery<Record<string, unknown>>(
      `SELECT page AS label, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
              SUM(position * impressions) / NULLIF(SUM(impressions),0) AS position
       FROM gsc_page_daily WHERE ${WHERE} AND page IS NOT NULL
       GROUP BY page ORDER BY SUM(clicks) DESC NULLS LAST, SUM(impressions) DESC NULLS LAST LIMIT 10`,
      scope,
    ),
  ]);

  const t = totals[0] ?? {};
  const clicks = num(t.clicks);
  const impressions = num(t.impressions);
  const toRow = (row: Record<string, unknown>): RankedRow => ({
    label: String(row.label ?? ""),
    primary: num(row.clicks),
    secondary: num(row.impressions),
    tertiary: num(row.impressions) > 0 ? num(row.clicks) / num(row.impressions) : 0,
    quaternary: num(row.position),
  });

  return {
    queryRows: num(t.rows),
    pageRows: num(pageCount[0]?.rows),
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: num(t.position),
    topQueries: queries.map(toRow),
    topPages: pages.map(toRow),
  };
}

export type BehaviorDetail = {
  sourceRows: number;
  landingRows: number;
  sessions: number;
  users: number;
  engagedSessions: number;
  conversions: number;
  topSources: RankedRow[];
  topLandingPages: RankedRow[];
};

export async function getBehaviorDetail(scope: Scope): Promise<BehaviorDetail> {
  const [totals, landingCount, sources, landing] = await Promise.all([
    safeQuery<Record<string, unknown>>(
      `SELECT COUNT(*)::bigint AS rows, COALESCE(SUM(sessions),0) AS sessions, COALESCE(SUM(users),0) AS users,
              COALESCE(SUM(engaged_sessions),0) AS engaged, COALESCE(SUM(conversions),0) AS conversions
       FROM ga4_source_daily WHERE ${WHERE}`,
      scope,
    ),
    safeQuery<Record<string, unknown>>(`SELECT COUNT(*)::bigint AS rows FROM ga4_landing_page_daily WHERE ${WHERE}`, scope),
    safeQuery<Record<string, unknown>>(
      `SELECT COALESCE(source,'(direct)') || COALESCE(' / ' || NULLIF(medium,''), '') AS label,
              SUM(sessions) AS sessions, SUM(users) AS users, SUM(engaged_sessions) AS engaged, SUM(conversions) AS conversions
       FROM ga4_source_daily WHERE ${WHERE}
       GROUP BY 1 ORDER BY SUM(sessions) DESC NULLS LAST LIMIT 10`,
      scope,
    ),
    safeQuery<Record<string, unknown>>(
      `SELECT landing_page AS label, SUM(sessions) AS sessions, SUM(users) AS users,
              SUM(engaged_sessions) AS engaged, SUM(conversions) AS conversions
       FROM ga4_landing_page_daily WHERE ${WHERE} AND landing_page IS NOT NULL
       GROUP BY landing_page ORDER BY SUM(sessions) DESC NULLS LAST LIMIT 10`,
      scope,
    ),
  ]);

  const t = totals[0] ?? {};
  const toRow = (row: Record<string, unknown>): RankedRow => ({
    label: String(row.label ?? ""),
    primary: num(row.sessions),
    secondary: num(row.users),
    tertiary: num(row.sessions) > 0 ? num(row.engaged) / num(row.sessions) : 0,
    quaternary: num(row.conversions),
  });

  return {
    sourceRows: num(t.rows),
    landingRows: num(landingCount[0]?.rows),
    sessions: num(t.sessions),
    users: num(t.users),
    engagedSessions: num(t.engaged),
    conversions: num(t.conversions),
    topSources: sources.map(toRow),
    topLandingPages: landing.map(toRow),
  };
}
