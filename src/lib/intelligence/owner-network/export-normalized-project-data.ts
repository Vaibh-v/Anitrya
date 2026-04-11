import {
  MASTER_HEADERS,
  MASTER_TABS,
  PROJECT_EXPORT_TABS,
} from "@/lib/intelligence/owner-network/headers";
import {
  appendRows,
  clearAndWriteSheet,
  readSheetValues,
  upsertRowByKey,
} from "@/lib/intelligence/owner-network/google-sheets";
import { ensureOwnerCustomerSheet } from "@/lib/intelligence/owner-network/customer-sheet-network";

type SyncResult = {
  provider: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: "success" | "error" | "skipped";
  reason: string;
  rowsSynced: number;
};

type ExportNormalizedProjectDataInput = {
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

function nowIso() {
  return new Date().toISOString();
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function buildCustomerSheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

async function replaceWorkspaceTab(args: {
  spreadsheetId: string;
  tabName: string;
  headers: string[];
  workspaceId: string;
  nextRows: string[][];
}) {
  const { spreadsheetId, tabName, headers, workspaceId, nextRows } = args;

  const existing = await readSheetValues(spreadsheetId, tabName);
  const headerRow =
    existing[0] && existing[0].length > 0 ? existing[0] : headers.slice();

  const workspaceIdIndex = headerRow.indexOf("workspace_id");

  const retainedRows =
    workspaceIdIndex >= 0
      ? existing
          .slice(1)
          .filter((row) => (row[workspaceIdIndex] ?? "") !== workspaceId)
      : existing.slice(1);

  await clearAndWriteSheet(spreadsheetId, tabName, [
    headerRow,
    ...retainedRows,
    ...nextRows,
  ]);
}

export async function exportNormalizedProjectDataToOwnerSheet(
  input: ExportNormalizedProjectDataInput,
) {
  const network = await ensureOwnerCustomerSheet(input.workspaceId);
  const syncedAt = nowIso();

  await upsertRowByKey({
    spreadsheetId: network.masterSpreadsheetId,
    tabName: MASTER_TABS.customers,
    headers: [...MASTER_HEADERS.customers],
    keyHeader: "workspace_id",
    row: {
      workspace_id: input.workspaceId,
      workspace_name: network.workspaceName,
      workspace_slug: network.workspaceSlug,
      owner_email: network.ownerEmail,
      customer_sheet_id: network.customerSpreadsheetId,
      customer_sheet_url: buildCustomerSheetUrl(network.customerSpreadsheetId),
      status: "active",
      created_at: network.createdAt,
      updated_at: syncedAt,
    },
  });

  await upsertRowByKey({
    spreadsheetId: network.masterSpreadsheetId,
    tabName: MASTER_TABS.projects,
    headers: [...MASTER_HEADERS.projects],
    keyHeader: "project_id",
    row: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      project_slug: input.projectSlug,
      project_label: input.projectLabel,
      mode: "project_scoped",
      status:
        input.results.some((result) => result.status === "error")
          ? "degraded"
          : "healthy",
      ga4_property_record_id: input.ga4PropertyRecordId ?? "",
      ga4_property_id: input.ga4PropertyId ?? "",
      ga4_property_label: input.ga4PropertyLabel ?? "",
      gsc_site_record_id: input.gscSiteRecordId ?? "",
      gsc_site_url: input.gscSiteUrl ?? "",
      last_synced_at: syncedAt,
      customer_sheet_id: network.customerSpreadsheetId,
    },
  });

  const syncHealthRows = input.results.map((result) => [
    syncedAt,
    input.workspaceId,
    input.projectId,
    input.projectSlug,
    result.provider,
    result.status,
    String(result.rowsSynced),
    result.reason,
    network.customerSpreadsheetId,
  ]);

  if (syncHealthRows.length > 0) {
    await appendRows(
      network.masterSpreadsheetId,
      MASTER_TABS.syncHealth,
      syncHealthRows,
    );
  }

  await replaceWorkspaceTab({
    spreadsheetId: network.customerSpreadsheetId,
    tabName: PROJECT_EXPORT_TABS.workspace,
    headers: [...MASTER_HEADERS.workspace],
    workspaceId: input.workspaceId,
    nextRows: [
      [
        input.workspaceId,
        input.projectId,
        input.projectSlug,
        input.projectLabel,
        input.from,
        input.to,
      ],
    ],
  });

  const ga4SourceRows = await readSheetValues(
    network.masterSpreadsheetId,
    PROJECT_EXPORT_TABS.ga4SourceDaily,
  );
  const ga4LandingRows = await readSheetValues(
    network.masterSpreadsheetId,
    PROJECT_EXPORT_TABS.ga4LandingPageDaily,
  );
  const gscQueryRows = await readSheetValues(
    network.masterSpreadsheetId,
    PROJECT_EXPORT_TABS.gscQueryDaily,
  );
  const gscPageRows = await readSheetValues(
    network.masterSpreadsheetId,
    PROJECT_EXPORT_TABS.gscPageDaily,
  );

  const copyProjectRows = async (args: {
    sourceRows: string[][];
    tabName: string;
    headers: string[];
  }) => {
    const { sourceRows, tabName, headers } = args;

    const headerRow =
      sourceRows[0] && sourceRows[0].length > 0 ? sourceRows[0] : headers.slice();

    const workspaceIdIndex = headerRow.indexOf("workspace_id");
    const projectSlugIndex = headerRow.indexOf("project_slug");

    const filteredRows =
      workspaceIdIndex >= 0 && projectSlugIndex >= 0
        ? sourceRows.slice(1).filter((row) => {
            return (
              (row[workspaceIdIndex] ?? "") === input.workspaceId &&
              (row[projectSlugIndex] ?? "") === input.projectSlug
            );
          })
        : [];

    await clearAndWriteSheet(network.customerSpreadsheetId, tabName, [
      headerRow,
      ...filteredRows,
    ]);
  };

  await copyProjectRows({
    sourceRows: ga4SourceRows,
    tabName: PROJECT_EXPORT_TABS.ga4SourceDaily,
    headers: [...MASTER_HEADERS.ga4SourceDaily],
  });

  await copyProjectRows({
    sourceRows: ga4LandingRows,
    tabName: PROJECT_EXPORT_TABS.ga4LandingPageDaily,
    headers: [...MASTER_HEADERS.ga4LandingPageDaily],
  });

  await copyProjectRows({
    sourceRows: gscQueryRows,
    tabName: PROJECT_EXPORT_TABS.gscQueryDaily,
    headers: [...MASTER_HEADERS.gscQueryDaily],
  });

  await copyProjectRows({
    sourceRows: gscPageRows,
    tabName: PROJECT_EXPORT_TABS.gscPageDaily,
    headers: [...MASTER_HEADERS.gscPageDaily],
  });

  return {
    masterSpreadsheetId: network.masterSpreadsheetId,
    customerSheetId: network.customerSpreadsheetId,
    syncedAt,
    summary: stringify(
      input.results.map((result) => ({
        provider: result.provider,
        status: result.status,
        rowsSynced: result.rowsSynced,
        reason: result.reason,
      })),
    ),
  };
}
