import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { INTEGRATION_CATALOG } from "@/lib/integrations/integration-catalog";
import { buildWorkspaceIntegrationSummary } from "@/lib/integrations/workspace-integration-summary";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const summary = await buildWorkspaceIntegrationSummary(workspaceId);

    return NextResponse.json({
      ok: true,
      catalog: INTEGRATION_CATALOG,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load integration catalog.",
      },
      { status: error?.status ?? 500 }
    );
  }
}