import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("project") ||
      session.user?.workspaceId ||
      "default-project";

    const summary = await buildIntelligenceSummary(projectId);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build intelligence summary.",
      },
      { status: error?.status ?? 500 }
    );
  }
}