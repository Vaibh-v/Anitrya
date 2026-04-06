import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { resolveWorkspaceToken } from "@/lib/integrations/workspace-token-resolver";
import { google } from "googleapis";

function extractSpreadsheetId(input: string) {
  const trimmed = input.trim();

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];

  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context on the current session." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      project?: string;
      projectId?: string;
      spreadsheetId?: string;
      from?: string;
      to?: string;
    };

    const projectRef = body.projectId?.trim() || body.project?.trim() || "";
    const spreadsheetInput = body.spreadsheetId?.trim() || "";
    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    const from = body.from?.trim() || "";
    const to = body.to?.trim() || "";

    if (!projectRef || !spreadsheetId || !from || !to) {
      return NextResponse.json(
        { error: "project, spreadsheetId, from, and to are required." },
        { status: 400 }
      );
    }

    const project = await getProjectMapping({
      projectRef,
      workspaceId,
    });

    const accessToken = await resolveWorkspaceToken({
      workspaceId,
      acceptedProviders: ["GOOGLE_GA4", "GOOGLE_GSC", "GOOGLE_GBP", "GOOGLE_ADS"],
      requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "workspace!A1:F2",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["workspace_id", "project_id", "project_slug", "project_label", "from", "to"],
          [workspaceId, project.projectId, project.projectSlug, project.projectLabel, from, to],
        ],
      },
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      projectSlug: project.projectSlug,
      note: "Customer sheet export completed for the selected project context.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Customer sheet export failed.";

    const scopedMessage = message.includes("required scopes")
      ? "Google Sheets access is not valid for the current workspace token. Reconnect Google with spreadsheet scope, then retry export."
      : message;

    return NextResponse.json({ error: scopedMessage }, { status: 401 });
  }
}