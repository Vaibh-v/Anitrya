import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getGoogleSheetsAccessTokenForSession } from "@/lib/google/tokens";
import { ensureTabsExist, appendRows } from "@/lib/google/google-sheets";
import { buildCustomerSheetExport } from "@/lib/export/build-customer-sheet-export";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { triggerMemoryPersistFromExport } from "@/lib/intelligence/memory-persist-trigger";

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Spreadsheet URL or ID is required.");
  }

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const spreadsheetInput =
      typeof body?.spreadsheetInput === "string" ? body.spreadsheetInput : "";
    const requestedProjectId =
      typeof body?.projectId === "string" ? body.projectId : "";
    const dateRange =
      body?.dateRange && typeof body.dateRange === "object"
        ? body.dateRange
        : undefined;

    if (!spreadsheetInput) {
      return NextResponse.json(
        { ok: false, error: "Spreadsheet URL or ID is required." },
        { status: 400 }
      );
    }

    const selectedProject = resolveSelectedProject({
      requestedProjectId,
      sessionWorkspaceId: session.user?.workspaceId ?? null,
      fallbackProjectId: "default-project",
    });

    if (!selectedProject.hasProject) {
      return NextResponse.json(
        { ok: false, error: "No project selected for export." },
        { status: 400 }
      );
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    const accessToken = await getGoogleSheetsAccessTokenForSession(session);

    await ensureTabsExist(accessToken, spreadsheetId);

    const exportPayload = await buildCustomerSheetExport({
      projectId: selectedProject.projectId,
      dateRange: {
        start: dateRange?.start,
        end: dateRange?.end,
      },
    });

    const writtenTabs: string[] = [];

    for (const [tabName, rows] of Object.entries(exportPayload)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const values = rows.map((row) =>
        Object.values(row as Record<string, unknown>)
      );

      await appendRows(accessToken, spreadsheetId, tabName, values);
      writtenTabs.push(tabName);
    }

    await appendRows(accessToken, spreadsheetId, "sync_health", [
      [
        new Date().toISOString(),
        "manual",
        writtenTabs.length > 0 ? "ok" : "warn",
        writtenTabs.length > 0
          ? `customer export completed for project ${selectedProject.projectId}`
          : `customer export ran but produced no rows for project ${selectedProject.projectId}`,
      ],
    ]);

    const memory = await triggerMemoryPersistFromExport({
      projectId: selectedProject.projectId,
      writtenTabs,
      dateRange: {
        start: dateRange?.start,
        end: dateRange?.end,
      },
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      projectId: selectedProject.projectId,
      projectLabel: selectedProject.displayName,
      writtenTabs,
      memory,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Customer sheet export failed.",
      },
      { status: error?.status ?? 500 }
    );
  }
}