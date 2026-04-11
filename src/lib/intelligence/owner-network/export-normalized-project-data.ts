import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_TABS,
  MASTER_TABS,
  OWNER_SYNC_MODE,
} from "@/lib/intelligence/owner-network/constants";
import {
  CUSTOMER_HEADERS,
  MASTER_HEADERS,
} from "@/lib/intelligence/owner-network/headers";
import {
  appendRows,
  overwriteSheet,
  readSheetValues,
  upsertRowByKey,
} from "@/lib/intelligence/owner-network/google-sheets";
import { ensureOwnerCustomerSheet } from "@/lib/intelligence/owner-network/customer-sheet-network";

type SyncResult = {
  provider: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: "success" | "error" | "skipped";
  rowsSynced: number;
  reason: string;
};

type Input = {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  ga4PropertyRecordId: string | null;
  ga4PropertyId: string | null;
  ga4PropertyLabel: string | null;
  gscSiteRecordId: string | null;
  gscSiteUrl: string | null;
  from: string;
  to: string;
  results: SyncResult[];
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function toStringValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

async function queryRows(
  sql: string,
): Promise<Array<Record<string, string | number | null>>> {
  return prisma.$queryRawUnsafe(sql) as Promise<
    Array<Record<string, string | number | null>>
  >;
}

async function replaceRowsForProjectRange(input: {
  spreadsheetId: string;
  tabName: string;
  headers: string[];
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  nextRows: string[][];
}) {
  const existing = await readSheetValues(input.spreadsheetId, input.tabName);
  const rows = existing.length > 0 ? existing : [input.headers];
  const header = rows[0];

  const workspaceIndex = header.indexOf("workspace_id");
  const projectSlugIndex = header.indexOf("project_slug");
  const dateIndex = header.indexOf("date");

  const keptRows = rows.slice(1).filter((row) => {
    const rowWorkspaceId = row[workspaceIndex] ?? "";
    const rowProjectSlug = row[projectSlugIndex] ?? "";
    const rowDate = row[dateIndex] ?? "";

    const shouldReplace =
      rowWorkspaceId === input.workspaceId &&
      rowProjectSlug === input.projectSlug &&
      inRange(rowDate, input.from, input.to);

    return !shouldReplace;
  });

  await overwriteSheet(input.spreadsheetId, input.tabName, [
    input.headers,
    ...keptRows,
    ...input.nextRows,
  ]);
}

export async function exportNormalizedProjectDataToOwnerSheet(input: Input) {
  const network = await ensureOwnerCustomerSheet(input.workspaceId);
  const now = new Date().toISOString();

  await upsertRowByKey({
    spreadsheetId: network.masterSpreadsheetId,
    tabName: MASTER_TABS.projects,
    headers: MASTER_HEADERS[MASTER_TABS.projects],
    keyHeader: "project_id",
    row: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      project_slug: input.projectSlug,
      project_label: input.projectLabel,
      mode: OWNER_SYNC_MODE,
      status: input.results.every((item) => item.status !== "error")
        ? "healthy"
        : "partial_failure",
      ga4_property_record_id: input.ga4PropertyRecordId ?? "",
      ga4_property_id: input.ga4PropertyId ?? "",
      ga4_property_label: input.ga4PropertyLabel ?? "",
      gsc_site_record_id: input.gscSiteRecordId ?? "",
      gsc_site_url: input.gscSiteUrl ?? "",
      last_synced_at: now,
      customer_sheet_id: network.customerSpreadsheetId,
    },
  });

  await upsertRowByKey({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: CUSTOMER_TABS.projects,
    headers: CUSTOMER_HEADERS[CUSTOMER_TABS.projects],
    keyHeader: "project_id",
    row: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      project_slug: input.projectSlug,
      project_label: input.projectLabel,
      mode: OWNER_SYNC_MODE,
      status: input.results.every((item) => item.status !== "error")
        ? "healthy"
        : "partial_failure",
      ga4_property_record_id: input.ga4PropertyRecordId ?? "",
      ga4_property_id: input.ga4PropertyId ?? "",
      ga4_property_label: input.ga4PropertyLabel ?? "",
      gsc_site_record_id: input.gscSiteRecordId ?? "",
      gsc_site_url: input.gscSiteUrl ?? "",
      last_synced_at: now,
    },
  });

  const masterSyncHealthRows = input.results.map((result) => [
    now,
    input.workspaceId,
    input.projectId,
    input.projectSlug,
    result.provider,
    result.status,
    String(result.rowsSynced),
    result.reason,
    network.customerSpreadsheetId,
  ]);

  await appendRows(
    network.masterSpreadsheetId,
    MASTER_TABS.syncHealth,
    masterSyncHealthRows,
  );

  await appendRows(
    network.customerSpreadsheetId,
    CUSTOMER_TABS.syncHealth,
    masterSyncHealthRows.map((row) => row.slice(0, 8)),
  );

  const ga4SourceRows = await queryRows(`
    SELECT
      date::text AS date,
      COALESCE(source, '') AS source,
      COALESCE(medium, '') AS medium,
      COALESCE(sessions, 0) AS sessions,
      COALESCE(users, 0) AS users,
      COALESCE(engaged_sessions, 0) AS engaged_sessions,
      COALESCE(conversions, 0) AS conversions
    FROM ga4_source_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
    ORDER BY date ASC
  `);

  const ga4LandingRows = await queryRows(`
    SELECT
      date::text AS date,
      COALESCE(landing_page, '') AS landing_page,
      COALESCE(page_path, '') AS page_path,
      COALESCE(sessions, 0) AS sessions,
      COALESCE(users, 0) AS users,
      COALESCE(engaged_sessions, 0) AS engaged_sessions,
      COALESCE(conversions, 0) AS conversions
    FROM ga4_landing_page_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
    ORDER BY date ASC
  `);

  const gscQueryRows = await queryRows(`
    SELECT
      date::text AS date,
      COALESCE(query, '') AS query,
      COALESCE(clicks, 0) AS clicks,
      COALESCE(impressions, 0) AS impressions,
      COALESCE(ctr, 0) AS ctr,
      COALESCE(position, 0) AS position
    FROM gsc_query_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
    ORDER BY date ASC
  `);

  const gscPageRows = await queryRows(`
    SELECT
      date::text AS date,
      COALESCE(page, '') AS page,
      COALESCE(clicks, 0) AS clicks,
      COALESCE(impressions, 0) AS impressions,
      COALESCE(ctr, 0) AS ctr,
      COALESCE(position, 0) AS position
    FROM gsc_page_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
    ORDER BY date ASC
  `);

  await replaceRowsForProjectRange({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: CUSTOMER_TABS.ga4SourceDaily,
    headers: CUSTOMER_HEADERS[CUSTOMER_TABS.ga4SourceDaily],
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
    nextRows: ga4SourceRows.map((row) => [
      input.workspaceId,
      input.projectId,
      input.projectSlug,
      input.projectLabel,
      toStringValue(row.date),
      toStringValue(row.source),
      toStringValue(row.medium),
      toStringValue(row.sessions),
      toStringValue(row.users),
      toStringValue(row.engaged_sessions),
      toStringValue(row.conversions),
      now,
    ]),
  });

  await replaceRowsForProjectRange({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: CUSTOMER_TABS.ga4LandingPageDaily,
    headers: CUSTOMER_HEADERS[CUSTOMER_TABS.ga4LandingPageDaily],
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
    nextRows: ga4LandingRows.map((row) => [
      input.workspaceId,
      input.projectId,
      input.projectSlug,
      input.projectLabel,
      toStringValue(row.date),
      toStringValue(row.landing_page),
      toStringValue(row.page_path),
      toStringValue(row.sessions),
      toStringValue(row.users),
      toStringValue(row.engaged_sessions),
      toStringValue(row.conversions),
      now,
    ]),
  });

  await replaceRowsForProjectRange({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: CUSTOMER_TABS.gscQueryDaily,
    headers: CUSTOMER_HEADERS[CUSTOMER_TABS.gscQueryDaily],
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
    nextRows: gscQueryRows.map((row) => [
      input.workspaceId,
      input.projectId,
      input.projectSlug,
      input.projectLabel,
      toStringValue(row.date),
      toStringValue(row.query),
      toStringValue(row.clicks),
      toStringValue(row.impressions),
      toStringValue(row.ctr),
      toStringValue(row.position),
      now,
    ]),
  });

  await replaceRowsForProjectRange({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: CUSTOMER_TABS.gscPageDaily,
    headers: CUSTOMER_HEADERS[CUSTOMER_TABS.gscPageDaily],
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
    nextRows: gscPageRows.map((row) => [
      input.workspaceId,
      input.projectId,
      input.projectSlug,
      input.projectLabel,
      toStringValue(row.date),
      toStringValue(row.page),
      toStringValue(row.clicks),
      toStringValue(row.impressions),
      toStringValue(row.ctr),
      toStringValue(row.position),
      now,
    ]),
  });

  return {
    customerSheetId: network.customerSpreadsheetId,
    customerSheetUrl: network.customerSpreadsheetUrl,
    exported: {
      ga4SourceDaily: ga4SourceRows.length,
      ga4LandingPageDaily: ga4LandingRows.length,
      gscQueryDaily: gscQueryRows.length,
      gscPageDaily: gscPageRows.length,
    },
  };
}