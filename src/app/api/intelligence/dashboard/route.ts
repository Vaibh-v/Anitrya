import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildIntelligenceDashboardPayload } from "@/lib/intelligence/intelligence-dashboard-builder";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("project") ||
      session.user?.workspaceId ||
      "default-project";

    const payload = await buildIntelligenceDashboardPayload(projectId);

    return NextResponse.json({
      ok: true,
      payload,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build intelligence dashboard payload.",
      },
      { status: error?.status ?? 500 }
    );
  }
}