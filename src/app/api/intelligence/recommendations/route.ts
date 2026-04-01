import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateRecommendations } from "@/lib/intelligence/recommendation-engine";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get("project") || session.user?.workspaceId;

    const recs = await generateRecommendations(projectId!);

    return NextResponse.json({
      ok: true,
      recommendations: recs,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}