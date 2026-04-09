import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { ensureNormalizedEvidenceTables } from "@/lib/evidence/ensure-normalized-evidence-tables";

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeGaDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return value;
}

export async function runGA4Sync(params: {
  accessToken: string;
  propertyId: string;
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}) {
  await ensureNormalizedEvidenceTables();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: params.accessToken });

  const analyticsData = google.analyticsdata({
    version: "v1beta",
    auth,
  });

  const normalizedPropertyId = params.propertyId.replace(/^properties\//, "").trim();

  let sourceResponse;
  let landingResponse;

  try {
    [sourceResponse, landingResponse] = await Promise.all([
      analyticsData.properties.runReport({
        property: `properties/${normalizedPropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: params.from, endDate: params.to }],
          dimensions: [{ name: "sessionSource" }, { name: "date" }],
          metrics: [{ name: "sessions" }],
          limit: "10000",
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${normalizedPropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: params.from, endDate: params.to }],
          dimensions: [{ name: "landingPage" }, { name: "date" }],
          metrics: [{ name: "sessions" }],
          limit: "10000",
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GA4 API error";
    throw new Error(`GA4 API request failed for property ${normalizedPropertyId}: ${message}`);
  }

  const sourceRows = sourceResponse.data.rows ?? [];
  const landingRows = landingResponse.data.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM ga4_source_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectSlug)}'
      AND date >= DATE '${escapeSql(params.from)}'
      AND date <= DATE '${escapeSql(params.to)}'
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM ga4_landing_page_daily
    WHERE workspace_id = '${escapeSql(params.workspaceId)}'
      AND project_slug = '${escapeSql(params.projectSlug)}'
      AND date >= DATE '${escapeSql(params.from)}'
      AND date <= DATE '${escapeSql(params.to)}'
  `);

  for (const row of sourceRows) {
    const source = row.dimensionValues?.[0]?.value ?? "unknown";
    const date = normalizeGaDate(row.dimensionValues?.[1]?.value ?? "");
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);

    if (!date) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO ga4_source_daily (workspace_id, project_slug, date, source, sessions)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(source)}',
        ${Number.isFinite(sessions) ? sessions : 0}
      )
    `);
  }

  for (const row of landingRows) {
    const landingPage = row.dimensionValues?.[0]?.value ?? "(not set)";
    const date = normalizeGaDate(row.dimensionValues?.[1]?.value ?? "");
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);

    if (!date) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO ga4_landing_page_daily (workspace_id, project_slug, date, landing_page, page_path, sessions)
      VALUES (
        '${escapeSql(params.workspaceId)}',
        '${escapeSql(params.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(landingPage)}',
        '${escapeSql(landingPage)}',
        ${Number.isFinite(sessions) ? sessions : 0}
      )
    `);
  }

  return {
    provider: "GOOGLE_GA4" as const,
    rowsSynced: sourceRows.length + landingRows.length,
    sourceRows: sourceRows.length,
    landingRows: landingRows.length,
  };
}