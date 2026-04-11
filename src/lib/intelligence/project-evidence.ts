import { prisma } from "@/lib/prisma";

export type Ga4SourceDailyRow = {
  date: string;
  source: string;
  medium: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  conversions: number;
};

export type Ga4LandingPageDailyRow = {
  date: string;
  landingPage: string;
  pagePath: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  conversions: number;
};

export type GscQueryDailyRow = {
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageDailyRow = {
  date: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type ProjectEvidenceBundle = {
  ga4SourceDaily: Ga4SourceDailyRow[];
  ga4LandingPageDaily: Ga4LandingPageDailyRow[];
  gscQueryDaily: GscQueryDailyRow[];
  gscPageDaily: GscPageDailyRow[];
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getProjectEvidenceBundle(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}): Promise<ProjectEvidenceBundle> {
  const { workspaceId, projectSlug, from, to } = input;

  const ga4SourceDaily = await prisma.$queryRawUnsafe<Ga4SourceDailyRow[]>(`
    SELECT
      date::text AS "date",
      COALESCE(source, '') AS "source",
      COALESCE(medium, '') AS "medium",
      COALESCE(sessions, 0) AS "sessions",
      COALESCE(users, 0) AS "users",
      COALESCE(engaged_sessions, 0) AS "engagedSessions",
      COALESCE(conversions, 0) AS "conversions"
    FROM ga4_source_daily
    WHERE workspace_id = '${escapeSql(workspaceId)}'
      AND project_slug = '${escapeSql(projectSlug)}'
      AND date >= DATE '${escapeSql(from)}'
      AND date <= DATE '${escapeSql(to)}'
    ORDER BY date ASC
  `);

  const ga4LandingPageDaily =
    await prisma.$queryRawUnsafe<Ga4LandingPageDailyRow[]>(`
      SELECT
        date::text AS "date",
        COALESCE(landing_page, '') AS "landingPage",
        COALESCE(page_path, '') AS "pagePath",
        COALESCE(sessions, 0) AS "sessions",
        COALESCE(users, 0) AS "users",
        COALESCE(engaged_sessions, 0) AS "engagedSessions",
        COALESCE(conversions, 0) AS "conversions"
      FROM ga4_landing_page_daily
      WHERE workspace_id = '${escapeSql(workspaceId)}'
        AND project_slug = '${escapeSql(projectSlug)}'
        AND date >= DATE '${escapeSql(from)}'
        AND date <= DATE '${escapeSql(to)}'
      ORDER BY date ASC
    `);

  const gscQueryDaily = await prisma.$queryRawUnsafe<GscQueryDailyRow[]>(`
    SELECT
      date::text AS "date",
      COALESCE(query, '') AS "query",
      COALESCE(clicks, 0) AS "clicks",
      COALESCE(impressions, 0) AS "impressions",
      COALESCE(ctr, 0) AS "ctr",
      COALESCE(position, 0) AS "position"
    FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(workspaceId)}'
      AND project_slug = '${escapeSql(projectSlug)}'
      AND date >= DATE '${escapeSql(from)}'
      AND date <= DATE '${escapeSql(to)}'
    ORDER BY date ASC
  `);

  const gscPageDaily = await prisma.$queryRawUnsafe<GscPageDailyRow[]>(`
    SELECT
      date::text AS "date",
      COALESCE(page, '') AS "page",
      COALESCE(clicks, 0) AS "clicks",
      COALESCE(impressions, 0) AS "impressions",
      COALESCE(ctr, 0) AS "ctr",
      COALESCE(position, 0) AS "position"
    FROM gsc_page_daily
    WHERE workspace_id = '${escapeSql(workspaceId)}'
      AND project_slug = '${escapeSql(projectSlug)}'
      AND date >= DATE '${escapeSql(from)}'
      AND date <= DATE '${escapeSql(to)}'
    ORDER BY date ASC
  `);

  return {
    ga4SourceDaily,
    ga4LandingPageDaily,
    gscQueryDaily,
    gscPageDaily,
  };
}