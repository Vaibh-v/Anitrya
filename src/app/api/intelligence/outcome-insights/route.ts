import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildOutcomeInsightsPayload } from "@/lib/intelligence/outcome-insights-builder";

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
    const projectId = searchParams.get("project") || workspaceId;

    const payload = await buildOutcomeInsightsPayload({
      workspaceId,
      projectId,
    });

    return NextResponse.json({
      ok: true,
      payload,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build outcome insights.",
      },
      { status: error?.status ?? 500 }
    );
  }
}