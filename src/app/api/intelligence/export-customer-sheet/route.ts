import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getGoogleSheetsAccessTokenForSession } from "@/lib/google/tokens";
import {
  ensureTabsExist,
  extractSpreadsheetId,
  replaceTabValues,
} from "@/lib/google/google-sheets";
import { buildCustomerSheetExport } from "@/lib/export/build-customer-sheet-export";
import { buildProviderHealthSummary } from "@/lib/integrations/provider-health-service";
import { buildProjectIntegrationHealth } from "@/lib/integrations/project-integration-health";

type RequestBody = {
  projectId?: string;
  projectLabel?: string;
  spreadsheetInput?: string;
  from?: string;
  to?: string;
};

function normalizeGoogleError(error: any) {
  const message =
    error?.response?.data?.error?.message ||
    error?.message ||
    "Customer sheet export failed.";

  if (
    typeof message === "string" &&
    (message.includes("invalid authentication credentials") ||
      message.includes("Expected OAuth 2 access token") ||
      message.includes("insufficient authentication scopes"))
  ) {
    return "Google Sheets access is not valid for the current workspace token. Reconnect Google with spreadsheet scope, then retry export.";
  }

  return message;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId ?? null;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 }
      );
    }

    const spreadsheetInput = body.spreadsheetInput?.trim();
    if (!spreadsheetInput) {
      return NextResponse.json(
        { error: "Spreadsheet URL or ID is required." },
        { status: 400 }
      );
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Could not extract a valid spreadsheet ID." },
        { status: 400 }
      );
    }

    const accessToken = await getGoogleSheetsAccessTokenForSession(session);
    const providerHealth = await buildProviderHealthSummary(workspaceId, projectId);
    const projectHealth = await buildProjectIntegrationHealth({
      workspaceId,
      projectId,
    });

    const exportPayload = buildCustomerSheetExport({
      spreadsheetId,
      projectId,
      projectLabel: body.projectLabel?.trim() || projectId,
      workspaceId,
      from: body.from ?? "",
      to: body.to ?? "",
      generatedAt: new Date().toISOString(),
      providerHealth,
      projectHealth,
    });

    await ensureTabsExist(
      accessToken,
      spreadsheetId,
      exportPayload.tabs.map((tab) => tab.title)
    );

    for (const tab of exportPayload.tabs) {
      await replaceTabValues(accessToken, spreadsheetId, tab.title, tab.rows);
    }

    return NextResponse.json({
      ok: true,
      spreadsheetId: exportPayload.spreadsheetId,
      sheetUrl: exportPayload.spreadsheetUrl,
      tabsWritten: exportPayload.tabs.map((tab) => tab.title),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: normalizeGoogleError(error) },
      { status: error?.status ?? 500 }
    );
  }
}