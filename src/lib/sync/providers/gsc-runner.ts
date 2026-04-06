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
  projectId: string;
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

  const [queryResponse, pageResponse] = await Promise.all([
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

  const queryRows = queryResponse.data.rows ?? [];
  const pageRows = pageResponse.data.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectId)}'
      AND date >= '${escapeSql(params.from)}'
      AND date <= '${escapeSql(params.to)}'
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM gsc_page_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectId)}'
      AND date >= '${escapeSql(params.from)}'
      AND date <= '${escapeSql(params.to)}'
  `);

  for (const row of queryRows) {
    const query = row.keys?.[0] ?? "";
    const date = row.keys?.[1] ?? "";

    if (!date || !query) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO gsc_query_daily (workspace_id, project_slug, date, query)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectId)}',
        '${escapeSql(date)}',
        '${escapeSql(query)}'
      )
    `);
  }

  for (const row of pageRows) {
    const page = row.keys?.[0] ?? "";
    const date = row.keys?.[1] ?? "";

    if (!date || !page) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO gsc_page_daily (workspace_id, project_slug, date, page)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectId)}',
        '${escapeSql(date)}',
        '${escapeSql(page)}'
      )
    `);
  }

  return {
    provider: "GOOGLE_GSC",
    rowsSynced: queryRows.length + pageRows.length,
    queryRows: queryRows.length,
    pageRows: pageRows.length,
  };
}