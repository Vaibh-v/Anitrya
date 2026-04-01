import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildCrossSourceHypotheses } from "@/lib/intelligence/cross-source-hypotheses";
import { applyLearningToHypotheses } from "@/lib/intelligence/hypothesis-engine";

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

    const base = await buildCrossSourceHypotheses({
      workspaceId,
      projectId,
    });

    const hypotheses = await applyLearningToHypotheses({
      workspaceId,
      projectId,
      hypotheses: base.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category === "cross_source" ? "cross_source" : "overview",
        summary: item.summary,
        score: item.rank,
        confidence: item.confidence,
        evidence: item.evidence,
        actions: item.actions,
        nextStep: item.actions[0] ?? "Review the supporting evidence.",
      })),
    });

    return NextResponse.json({
      ok: true,
      hypotheses,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build hypotheses.",
      },
      { status: error?.status ?? 500 }
    );
  }
}