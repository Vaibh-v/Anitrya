import {
  CUSTOMER_HEADERS,
  MASTER_HEADERS,
} from "@/lib/intelligence/owner-network/headers";
import {
  CUSTOMER_TABS,
  MASTER_TABS,
} from "@/lib/intelligence/owner-network/constants";
import {
  appendRows,
  clearAndWriteManySheets,
  clearAndWriteSheet,
  ensureSheetStructure,
  ensureTabsExist,
  readManySheetValues,
  readSheetValues,
  upsertRowByKey,
} from "@/lib/intelligence/owner-network/google-sheets";
import {
  EVIDENCE_TABLE_SPECS,
  MAX_ROWS_PER_TAB_ENV,
  mergeProjectRows,
  resolveMaxRowsPerTab,
  toSheetRow,
} from "@/lib/export/normalized-evidence-specs";
import { readEvidenceTable } from "@/lib/export/normalized-evidence-reader";
import { ensureOwnerCustomerSheet } from "@/lib/intelligence/owner-network/customer-sheet-network";
import type { IntegrationSyncResult } from "@/lib/integrations/sync-contracts";
import {
  loadSemrushExportDataset,
  type SemrushExportStatus,
} from "@/lib/integrations/semrush/semrush-export-adapter";

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
  results: IntegrationSyncResult[];
};

function nowIso() {
  return new Date().toISOString();
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

// Sheets writes here use USER_ENTERED; keep SEMrush free-text cells literal.
function asLiteralText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

async function mirrorSemrushEvidence(input: {
  customerSpreadsheetId: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
}): Promise<SemrushExportStatus> {
  try {
    const dataset = await loadSemrushExportDataset({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      from: input.from,
      to: input.to,
      prefix: {
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        project_slug: input.projectSlug,
        project_label: input.projectLabel,
      },
    });

    if (!dataset) {
      return {
        status: "skipped",
        reason: "No SEMrush evidence stored for this project and window.",
      };
    }

    const textColumns = new Set(
      ["keyword", "page_url"].map((column) => dataset.header.indexOf(column)),
    );
    const rows = dataset.rows.map((row) =>
      row.map((cell, index) => (textColumns.has(index) ? asLiteralText(cell) : cell)),
    );

    await ensureSheetStructure(input.customerSpreadsheetId, {
      [CUSTOMER_TABS.semrushEvidence]: dataset.header,
    });
    await clearAndWriteSheet(
      input.customerSpreadsheetId,
      CUSTOMER_TABS.semrushEvidence,
      [dataset.header, ...rows],
    );

    return {
      status: "written",
      tab: CUSTOMER_TABS.semrushEvidence,
      rows: dataset.rowCount,
      snapshotDate: dataset.snapshotDate,
    };
  } catch (error) {
    // Never let the SEMrush mirror break the owner export.
    console.error("OWNER_EXPORT_SEMRUSH_FAILED", error);
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "SEMrush mirror failed.",
    };
  }
}

export type OwnerEvidenceTabResult = {
  tab: string;
  status: "written" | "missing_table" | "error";
  rows: number;
  truncated: boolean;
  error?: string;
};

export type OwnerEvidenceMirrorResult = {
  status: "written" | "partial" | "error";
  tabs: OwnerEvidenceTabResult[];
  error?: string;
};

/**
 * Write this project's normalized evidence (read from Postgres, the source of
 * truth) into the customer workbook. Previously these tabs were copied from
 * owner-master tabs that nothing populated, so customers received headers
 * only. Other projects' rows in the same workbook are preserved.
 *
 * Uses a fixed number of Sheets calls regardless of tab count and never
 * throws: failures are reported per tab.
 */
async function mirrorProjectEvidence(input: {
  customerSpreadsheetId: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
  syncedAt: string;
}): Promise<OwnerEvidenceMirrorResult> {
  const limit = resolveMaxRowsPerTab(process.env[MAX_ROWS_PER_TAB_ENV]);
  const identity = {
    workspace_id: input.workspaceId,
    project_id: input.projectId,
    project_slug: input.projectSlug,
    project_label: input.projectLabel,
  };

  const reads = await Promise.all(
    EVIDENCE_TABLE_SPECS.map((spec) =>
      readEvidenceTable({
        spec,
        workspaceId: input.workspaceId,
        projectSlug: input.projectSlug,
        from: input.from,
        to: input.to,
        limit,
      }),
    ),
  );

  const tabs: OwnerEvidenceTabResult[] = [];
  const writable = reads.filter((read) => {
    if (read.status === "ok") return true;
    tabs.push({
      tab: read.spec.tab,
      status: read.status,
      rows: 0,
      truncated: false,
      error: read.error,
    });
    return false;
  });

  if (writable.length === 0) {
    return { status: tabs.some((t) => t.status === "error") ? "error" : "written", tabs };
  }

  try {
    const tabNames = writable.map((read) => read.spec.tab);
    await ensureTabsExist(input.customerSpreadsheetId, tabNames);
    const existing = await readManySheetValues(input.customerSpreadsheetId, tabNames);

    const writes = writable.map((read) => {
      const header =
        CUSTOMER_HEADERS[read.spec.tab] ??
        ["workspace_id", "project_id", "project_slug", "project_label", ...read.spec.columns, "synced_at"];
      const nextRows = read.rows.map((row) => toSheetRow(header, row, identity, input.syncedAt));

      tabs.push({
        tab: read.spec.tab,
        status: "written",
        rows: nextRows.length,
        truncated: read.truncated,
      });

      return {
        tabName: read.spec.tab,
        rows: mergeProjectRows({
          existing: existing[read.spec.tab] ?? [],
          header,
          workspaceId: input.workspaceId,
          projectSlug: input.projectSlug,
          nextRows,
        }),
      };
    });

    // RAW keeps query/page strings literal (no formula interpretation).
    await clearAndWriteManySheets(input.customerSpreadsheetId, writes, "RAW");

    // A missing table just means that source has never synced for this
    // deployment; only read/write errors make the mirror partial.
    return {
      status: tabs.some((t) => t.status === "error") ? "partial" : "written",
      tabs,
    };
  } catch (error) {
    console.error("OWNER_EXPORT_EVIDENCE_FAILED", error);
    return {
      status: "error",
      tabs,
      error: error instanceof Error ? error.message : "Evidence mirror failed.",
    };
  }
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
      created_at: syncedAt,
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
    tabName: CUSTOMER_TABS.projects,
    headers: [...CUSTOMER_HEADERS[CUSTOMER_TABS.projects]],
    workspaceId: input.workspaceId,
    nextRows: [
      [
        input.workspaceId,
        input.projectId,
        input.projectSlug,
        input.projectLabel,
        "project_scoped",
        input.results.some((result) => result.status === "error")
          ? "degraded"
          : "healthy",
        input.ga4PropertyRecordId ?? "",
        input.ga4PropertyId ?? "",
        input.ga4PropertyLabel ?? "",
        input.gscSiteRecordId ?? "",
        input.gscSiteUrl ?? "",
        syncedAt,
      ],
    ],
  });

  const evidence = await mirrorProjectEvidence({
    customerSpreadsheetId: network.customerSpreadsheetId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectLabel: input.projectLabel,
    from: input.from,
    to: input.to,
    syncedAt,
  });

  const semrush = await mirrorSemrushEvidence({
    customerSpreadsheetId: network.customerSpreadsheetId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectLabel: input.projectLabel,
    from: input.from,
    to: input.to,
  });

  return {
    masterSpreadsheetId: network.masterSpreadsheetId,
    customerSheetId: network.customerSpreadsheetId,
    syncedAt,
    evidence,
    semrush,
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
