import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildIntelligencePageSummary } from "@/lib/intelligence/intelligence-page-summary";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("project") ||
      session.user?.workspaceId ||
      "default-project";

    const payload = await buildIntelligencePageSummary(projectId);

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build intelligence page summary.",
      },
      { status: error?.status ?? 500 }
    );
  }
}