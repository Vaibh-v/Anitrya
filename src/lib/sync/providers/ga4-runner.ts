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

  const property = `properties/${normalizedPropertyId}`;
  const metrics = [
    { name: "sessions" },
    { name: "totalUsers" },
    { name: "engagedSessions" },
    { name: "keyEvents" },
  ];

  let sourceResponse;
  let landingResponse;

  try {
    [sourceResponse, landingResponse] = await Promise.all([
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: params.from, endDate: params.to }],
          dimensions: [{ name: "date" }, { name: "sessionSource" }, { name: "sessionMedium" }],
          metrics,
          limit: "100000",
        },
      }),
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: params.from, endDate: params.to }],
          dimensions: [{ name: "date" }, { name: "landingPage" }],
          metrics,
          limit: "100000",
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GA4 API error";
    throw new Error(`GA4 API request failed for property ${normalizedPropertyId}: ${message}`);
  }

  const metric = (row: { metricValues?: Array<{ value?: string | null }> | null }, index: number) => {
    const value = Number(row.metricValues?.[index]?.value ?? 0);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };

  const sourceRows = (sourceResponse.data.rows ?? [])
    .map((row) => ({
      date: normalizeGaDate(row.dimensionValues?.[0]?.value ?? ""),
      source: row.dimensionValues?.[1]?.value || "(direct)",
      medium: row.dimensionValues?.[2]?.value || null,
      sessions: metric(row, 0),
      users: metric(row, 1),
      engaged: metric(row, 2),
      conversions: metric(row, 3),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));

  const landingRows = (landingResponse.data.rows ?? [])
    .map((row) => ({
      date: normalizeGaDate(row.dimensionValues?.[0]?.value ?? ""),
      landingPage: row.dimensionValues?.[1]?.value || "(not set)",
      sessions: metric(row, 0),
      users: metric(row, 1),
      engaged: metric(row, 2),
      conversions: metric(row, 3),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));

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

  // Parameterized multi-row inserts in chunks: far fewer round trips than one INSERT per row.
  const CHUNK = 500;

  for (let offset = 0; offset < sourceRows.length; offset += CHUNK) {
    const chunk = sourceRows.slice(offset, offset + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row, index) => {
      const base = index * 7;
      values.push(row.date, row.source, row.medium, row.sessions, row.users, row.engaged, row.conversions);
      return `($1, $2, CAST($${base + 3} AS DATE), $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO ga4_source_daily (workspace_id, project_slug, date, source, medium, sessions, users, engaged_sessions, conversions)
       VALUES ${tuples.join(", ")}`,
      params.workspaceId,
      params.projectSlug,
      ...values,
    );
  }

  for (let offset = 0; offset < landingRows.length; offset += CHUNK) {
    const chunk = landingRows.slice(offset, offset + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row, index) => {
      const base = index * 6;
      values.push(row.date, row.landingPage, row.sessions, row.users, row.engaged, row.conversions);
      return `($1, $2, CAST($${base + 3} AS DATE), $${base + 4}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO ga4_landing_page_daily (workspace_id, project_slug, date, landing_page, page_path, sessions, users, engaged_sessions, conversions)
       VALUES ${tuples.join(", ")}`,
      params.workspaceId,
      params.projectSlug,
      ...values,
    );
  }

  return {
    provider: "GOOGLE_GA4" as const,
    rowsSynced: sourceRows.length + landingRows.length,
    sourceRows: sourceRows.length,
    landingRows: landingRows.length,
  };
}