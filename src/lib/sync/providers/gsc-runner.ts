import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { ensureNormalizedEvidenceTables } from "@/lib/evidence/ensure-normalized-evidence-tables";

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function runGSCSync(params: {
  accessToken: string;
  siteUrl: string;
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}) {
  await ensureNormalizedEvidenceTables();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: params.accessToken });

  const searchconsole = google.searchconsole({
    version: "v1",
    auth,
  });

  let queryResponse;
  let pageResponse;

  try {
    [queryResponse, pageResponse] = await Promise.all([
      searchconsole.searchanalytics.query({
        siteUrl: params.siteUrl,
        requestBody: {
          startDate: params.from,
          endDate: params.to,
          dimensions: ["query", "date"],
          rowLimit: 25000,
        },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: params.siteUrl,
        requestBody: {
          startDate: params.from,
          endDate: params.to,
          dimensions: ["page", "date"],
          rowLimit: 25000,
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Search Console API error";
    throw new Error(`GSC API request failed for site ${params.siteUrl}: ${message}`);
  }

  const queryRows = queryResponse.data.rows ?? [];
  const pageRows = pageResponse.data.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectSlug)}'
      AND date >= DATE '${escapeSql(params.from)}'
      AND date <= DATE '${escapeSql(params.to)}'
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_page_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectSlug)}'
      AND date >= DATE '${escapeSql(params.from)}'
      AND date <= DATE '${escapeSql(params.to)}'
  `);

  for (const row of queryRows) {
    const query = row.keys?.[0] ?? "";
    const date = row.keys?.[1] ?? "";
    const clicks = Number(row.clicks ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const ctr = Number(row.ctr ?? 0);
    const position = Number(row.position ?? 0);

    if (!date || !query) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO gsc_query_daily (workspace_id, project_slug, date, query, clicks, impressions, ctr, position)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(query)}',
        ${Number.isFinite(clicks) ? clicks : 0},
        ${Number.isFinite(impressions) ? impressions : 0},
        ${Number.isFinite(ctr) ? ctr : 0},
        ${Number.isFinite(position) ? position : 0}
      )
    `);
  }

  for (const row of pageRows) {
    const page = row.keys?.[0] ?? "";
    const date = row.keys?.[1] ?? "";
    const clicks = Number(row.clicks ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const ctr = Number(row.ctr ?? 0);
    const position = Number(row.position ?? 0);

    if (!date || !page) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO gsc_page_daily (workspace_id, project_slug, date, page, clicks, impressions, ctr, position)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(page)}',
        ${Number.isFinite(clicks) ? clicks : 0},
        ${Number.isFinite(impressions) ? impressions : 0},
        ${Number.isFinite(ctr) ? ctr : 0},
        ${Number.isFinite(position) ? position : 0}
      )
    `);
  }

  return {
    provider: "GOOGLE_GSC" as const,
    rowsSynced: queryRows.length + pageRows.length,
    queryRows: queryRows.length,
    pageRows: pageRows.length,
  };
}