import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildDecisionBrief } from "@/lib/intelligence/decision-brief-builder";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("project") ||
      session.user?.workspaceId ||
      "default-project";

    const brief = await buildDecisionBrief(projectId);

    return NextResponse.json({
      ok: true,
      brief,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build decision brief.",
      },
      { status: error?.status ?? 500 }
    );
  }
}