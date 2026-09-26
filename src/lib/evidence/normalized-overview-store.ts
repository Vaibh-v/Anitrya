import { prisma } from "@/lib/prisma";

export type OverviewEvidenceSummary = {
  ga4SourceRows: number;
  ga4LandingRows: number;
  gscQueryRows: number;
  gscPageRows: number;
  googleAdsCampaignRows: number;
  gbpLocationRows: number;
  failureReason: string | null;
};

type CountRow = {
  count: bigint | number;
};

function toCount(value: bigint | number | undefined): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("can't reach database server") ||
    message.includes("prismaclientinitializationerror") ||
    message.includes("database server")
  );
}

async function countRows(params: {
  table: string;
  workspaceId: string;
  projectId: string;
  from: string;
  to: string;
}): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(`
    SELECT COUNT(*)::bigint AS count
    FROM ${params.table}
    WHERE workspace_id = '${params.workspaceId.replace(/'/g, "''")}'
      AND project_slug = '${params.projectId.replace(/'/g, "''")}'
      AND date >= '${params.from.replace(/'/g, "''")}'
      AND date <= '${params.to.replace(/'/g, "''")}'
  `);

  return toCount(rows?.[0]?.count);
}

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("does not exist") ||
    message.includes("42p01") ||
    message.includes("42703")
  );
}

/**
 * One source's table not existing yet (e.g. Google Ads / Business Profile
 * before their first sync) must not blank out the whole overview. Missing
 * tables or columns count as 0 rows; real database failures still surface.
 */
async function countRowsSafely(params: Parameters<typeof countRows>[0]): Promise<number> {
  try {
    return await countRows(params);
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn(`OVERVIEW_EVIDENCE_TABLE_UNAVAILABLE ${params.table}`);
      return 0;
    }
    console.error(`OVERVIEW_EVIDENCE_COUNT_FAILED ${params.table}`, error);
    throw error;
  }
}

export async function getOverviewEvidenceSummary(input: {
  workspaceId: string;
  projectId: string;
  from: string;
  to: string;
}): Promise<OverviewEvidenceSummary> {
  try {
    const [ga4SourceRows, ga4LandingRows, gscQueryRows, gscPageRows, googleAdsCampaignRows, gbpLocationRows] =
      await Promise.all([
        countRowsSafely({
          table: "ga4_source_daily",
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          from: input.from,
          to: input.to,
        }),
        countRowsSafely({
          table: "ga4_landing_page_daily",
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          from: input.from,
          to: input.to,
        }),
        countRowsSafely({
          table: "gsc_query_daily",
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          from: input.from,
          to: input.to,
        }),
        countRowsSafely({
          table: "gsc_page_daily",
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          from: input.from,
          to: input.to,
        }),
        countRowsSafely({ table: "google_ads_campaign_daily", ...input }),
        countRowsSafely({ table: "gbp_location_daily", ...input }),
      ]);

    return {
      ga4SourceRows,
      ga4LandingRows,
      gscQueryRows,
      gscPageRows,
      googleAdsCampaignRows,
      gbpLocationRows,
      failureReason: null,
    };
  } catch (error) {
    return {
      ga4SourceRows: 0,
      ga4LandingRows: 0,
      gscQueryRows: 0,
      gscPageRows: 0,
      googleAdsCampaignRows: 0,
      gbpLocationRows: 0,
      failureReason: isDatabaseUnavailableError(error)
        ? "The database connection is currently unavailable, so normalized overview evidence could not be read."
        : error instanceof Error
          ? error.message
          : "Overview evidence could not be loaded.",
    };
  }
}
