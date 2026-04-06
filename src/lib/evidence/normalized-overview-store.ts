import { prisma } from "@/lib/prisma";

export type OverviewEvidenceSummary = {
  ga4SourceRows: number;
  ga4LandingRows: number;
  gscQueryRows: number;
  gscPageRows: number;
};

type CountRow = {
  count: bigint | number;
};

function toCount(value: bigint | number | undefined): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

async function countRows(params: {
  table: string;
  workspaceId: string;
  projectId: string;
  from: string;
  to: string;
}): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<CountRow[]>(`
      SELECT COUNT(*)::bigint AS count
      FROM ${params.table}
      WHERE workspace_id = '${params.workspaceId.replace(/'/g, "''")}'
        AND project_slug = '${params.projectId.replace(/'/g, "''")}'
        AND date >= '${params.from.replace(/'/g, "''")}'
        AND date <= '${params.to.replace(/'/g, "''")}'
    `);

    return toCount(rows?.[0]?.count);
  } catch {
    return 0;
  }
}

export async function getOverviewEvidenceSummary(input: {
  workspaceId: string;
  projectId: string;
  from: string;
  to: string;
}): Promise<OverviewEvidenceSummary> {
  const [ga4SourceRows, ga4LandingRows, gscQueryRows, gscPageRows] =
    await Promise.all([
      countRows({
        table: "ga4_source_daily",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        from: input.from,
        to: input.to,
      }),
      countRows({
        table: "ga4_landing_page_daily",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        from: input.from,
        to: input.to,
      }),
      countRows({
        table: "gsc_query_daily",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        from: input.from,
        to: input.to,
      }),
      countRows({
        table: "gsc_page_daily",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        from: input.from,
        to: input.to,
      }),
    ]);

  return {
    ga4SourceRows,
    ga4LandingRows,
    gscQueryRows,
    gscPageRows,
  };
}