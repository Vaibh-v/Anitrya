import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SHEET_ROTATE_AT_CELLS,
  MASTER_TABS,
  OWNER_MASTER_SPREADSHEET_ID,
} from "@/lib/intelligence/owner-network/constants";
import { MASTER_HEADERS } from "@/lib/intelligence/owner-network/headers";
import {
  appendRows,
  countSpreadsheetCells,
  createSpreadsheet,
  ensureSheetStructure,
  readSheetValues,
  upsertRowByKey,
} from "@/lib/intelligence/owner-network/google-sheets";
import {
  getOwnerCustomerSheetByIndex,
  OWNER_CUSTOMER_SHEET_REGISTRY,
} from "@/lib/intelligence/owner-network/customer-sheet-registry";

type OwnerCustomerSheetRef = {
  masterSpreadsheetId: string;
  customerSpreadsheetId: string;
  customerSpreadsheetUrl: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  ownerEmail: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function recordSheet(input: {
  workspaceId: string;
  workspaceName: string;
  sheetId: string;
  sheetUrl: string;
  role: "active" | "archive";
  activeFrom: string;
  activeTo: string;
  cells: string;
}) {
  await ensureSheetStructure(OWNER_MASTER_SPREADSHEET_ID, {
    [MASTER_TABS.sheetArchive]: MASTER_HEADERS[MASTER_TABS.sheetArchive],
  });
  await appendRows(OWNER_MASTER_SPREADSHEET_ID, MASTER_TABS.sheetArchive, [
    [
      input.workspaceId,
      input.workspaceName,
      input.sheetId,
      input.sheetUrl,
      input.role,
      input.activeFrom,
      input.activeTo,
      input.cells,
      new Date().toISOString(),
    ],
  ]);
}

function safe(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export async function ensureOwnerCustomerSheet(
  workspaceId: string,
): Promise<OwnerCustomerSheetRef> {
  if (!OWNER_MASTER_SPREADSHEET_ID) {
    throw new Error("ANITRYA_OWNER_MASTER_SPREADSHEET_ID is missing.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found for owner-sheet export.");
  }

  const ownerEmail = safe(workspace.memberships[0]?.user.email);
  const workspaceName = safe(workspace.name);
  const workspaceSlug = safe(workspace.slug);

  await ensureSheetStructure(OWNER_MASTER_SPREADSHEET_ID, MASTER_HEADERS);

  const customerRows = await readSheetValues(
    OWNER_MASTER_SPREADSHEET_ID,
    MASTER_TABS.customers,
  );

  const header = customerRows[0] ?? MASTER_HEADERS[MASTER_TABS.customers];
  const workspaceIdIndex = header.indexOf("workspace_id");
  const customerSheetIdIndex = header.indexOf("customer_sheet_id");
  const customerSheetUrlIndex = header.indexOf("customer_sheet_url");

  let customerSheetId = "";
  let customerSheetUrl = "";

  for (const row of customerRows.slice(1)) {
    if ((row[workspaceIdIndex] ?? "") === workspaceId) {
      customerSheetId = row[customerSheetIdIndex] ?? "";
      customerSheetUrl = row[customerSheetUrlIndex] ?? "";
      break;
    }
  }

  if (!customerSheetId) {
    const assignedIndex = customerRows.length - 1;
    const assignedSheet = getOwnerCustomerSheetByIndex(assignedIndex);

    if (assignedSheet) {
      customerSheetId = assignedSheet.spreadsheetId;
      customerSheetUrl = assignedSheet.spreadsheetUrl;
    } else {
      // Past the pre-made sheets: create one for this customer automatically.
      const created = await createSpreadsheet(`Anitrya · ${workspaceName || workspaceSlug || workspaceId}`);
      customerSheetId = created.spreadsheetId;
      customerSheetUrl = created.spreadsheetUrl;
    }
    await recordSheet({ workspaceId, workspaceName, sheetId: customerSheetId, sheetUrl: customerSheetUrl, role: "active", activeFrom: today(), activeTo: "", cells: "" });
  }

  // Archive rotation: never delete or roll up history. When the active sheet
  // nears Google's 10M-cell limit it becomes an archive and a fresh sheet
  // takes over; the master records every sheet and its dates.
  try {
    const cells = await countSpreadsheetCells(customerSheetId);
    if (cells >= CUSTOMER_SHEET_ROTATE_AT_CELLS) {
      const created = await createSpreadsheet(`Anitrya · ${workspaceName || workspaceSlug || workspaceId} · from ${today()}`);
      await recordSheet({ workspaceId, workspaceName, sheetId: customerSheetId, sheetUrl: customerSheetUrl, role: "archive", activeFrom: "", activeTo: today(), cells: String(cells) });
      customerSheetId = created.spreadsheetId;
      customerSheetUrl = created.spreadsheetUrl;
      await recordSheet({ workspaceId, workspaceName, sheetId: customerSheetId, sheetUrl: customerSheetUrl, role: "active", activeFrom: today(), activeTo: "", cells: "" });
    }
  } catch (error) {
    console.error("CUSTOMER_SHEET_ROTATION_CHECK_FAILED", error instanceof Error ? error.message : error);
  }

  const now = new Date().toISOString();

  await upsertRowByKey({
    spreadsheetId: OWNER_MASTER_SPREADSHEET_ID,
    tabName: MASTER_TABS.customers,
    headers: MASTER_HEADERS[MASTER_TABS.customers],
    keyHeader: "workspace_id",
    row: {
      workspace_id: workspaceId,
      workspace_name: workspaceName,
      workspace_slug: workspaceSlug,
      owner_email: ownerEmail,
      customer_sheet_id: customerSheetId,
      customer_sheet_url: customerSheetUrl,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    masterSpreadsheetId: OWNER_MASTER_SPREADSHEET_ID,
    customerSpreadsheetId: customerSheetId,
    customerSpreadsheetUrl: customerSheetUrl,
    workspaceId,
    workspaceName,
    workspaceSlug,
    ownerEmail,
  };
}

export function getPreassignedOwnerSheetCount() {
  return OWNER_CUSTOMER_SHEET_REGISTRY.length;
}