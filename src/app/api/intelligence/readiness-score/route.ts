import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildReadinessScore } from "@/lib/intelligence/readiness-score-builder";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("project") ||
      session.user?.workspaceId ||
      "default-project";

    const readiness = await buildReadinessScore(projectId);

    return NextResponse.json({
      ok: true,
      readiness,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build readiness score.",
      },
      { status: error?.status ?? 500 }
    );
  }
}