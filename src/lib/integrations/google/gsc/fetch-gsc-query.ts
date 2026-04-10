import { prisma } from "@/lib/prisma";

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
  console.log("GSC query sync siteUrl:", input.siteUrl);

  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      input.siteUrl,
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: input.from,
        endDate: input.to,
        dimensions: ["date", "query"],
        rowLimit: 25000,
      }),
    },
  );

  const payload = (await response.json()) as {
    rows?: GscRow[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `GSC query sync failed for site ${input.siteUrl}.`,
    );
  }

  const rows = payload.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
  `);

  for (const row of rows) {
    const date = row.keys?.[0] ?? "";
    const query = row.keys?.[1] ?? "";
    if (!date) continue;

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
      VALUES (
        '${escapeSql(input.workspaceId)}',
        '${escapeSql(input.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(query)}',
        ${Number(row.clicks ?? 0)},
        ${Number(row.impressions ?? 0)},
        ${Number(row.ctr ?? 0)},
        ${Number(row.position ?? 0)}
      )
    `);
  }

  return rows.length;
}