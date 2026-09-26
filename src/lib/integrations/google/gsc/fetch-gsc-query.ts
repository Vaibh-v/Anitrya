import { prisma } from "@/lib/prisma";
import { fetchAllGscRows } from "@/lib/integrations/google/gsc/fetch-gsc-rows";

type Input = {
  workspaceId: string;
  projectSlug: string;
  siteUrl: string;
  accessToken: string;
  from: string;
  to: string;
};

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function fetchGSCQueryDaily(input: Input): Promise<number> {
  const rows: GscRow[] = await fetchAllGscRows({
    siteUrl: input.siteUrl,
    accessToken: input.accessToken,
    from: input.from,
    to: input.to,
    dimensions: ["date", "query"],
    label: "query",
  });

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
  `);

  const normalizedRows = rows
    .map((row) => {
      const date = row.keys?.[0] ?? "";
      const query = row.keys?.[1] ?? "";
      if (!date) return null;

      return `(
        '${escapeSql(input.workspaceId)}',
        '${escapeSql(input.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(query)}',
        ${Number(row.clicks ?? 0)},
        ${Number(row.impressions ?? 0)},
        ${Number(row.ctr ?? 0)},
        ${Number(row.position ?? 0)}
      )`;
    })
    .filter((value): value is string => Boolean(value));

  // Insert in chunks so a large site never builds one oversized statement.
  for (let offset = 0; offset < normalizedRows.length; offset += 2000) {
    const chunk = normalizedRows.slice(offset, offset + 2000);
    await prisma.$executeRawUnsafe(`
      INSERT INTO gsc_query_daily (
        workspace_id,
        project_slug,
        date,
        query,
        clicks,
        impressions,
        ctr,
        position
      )
      VALUES ${chunk.join(",\n")}
    `);
  }

  return normalizedRows.length;
}