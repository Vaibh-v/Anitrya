import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildProviderHealthSummary } from "@/lib/integrations/provider-health-service";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project");

    const summary = await buildProviderHealthSummary(workspaceId, projectId);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to compute provider health.",
      },
      { status: error?.status ?? 500 }
    );
  }
}