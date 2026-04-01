import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateHypotheses } from "@/lib/intelligence/hypothesis-engine";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get("project") || session.user?.workspaceId;

    const insights = await generateHypotheses(projectId!);

    return NextResponse.json({
      ok: true,
      insights,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}