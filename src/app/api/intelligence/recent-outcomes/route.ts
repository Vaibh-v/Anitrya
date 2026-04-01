import { NextResponse } from "next/server";
import { listRecommendationOutcomes } from "@/lib/intelligence/outcome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const workspaceId = normalize(searchParams.get("workspaceId"));
    const projectSlug = normalize(searchParams.get("projectSlug"));
    const hypothesisTitle = normalize(searchParams.get("hypothesisTitle"));
    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 20;

    if (!workspaceId || !projectSlug) {
      return json(
        {
          ok: false,
          error: "INVALID_INPUT",
          message: "workspaceId and projectSlug are required.",
        },
        400
      );
    }

    const rows = await listRecommendationOutcomes({
      workspaceId,
      projectSlug,
      hypothesisTitle: hypothesisTitle ?? undefined,
      limit,
    });

    return json({
      ok: true,
      rows: rows.map((row) => ({
        ...row,
        created_at: row.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("RECENT_OUTCOMES_ROUTE_FAILED", error);

    return json(
      {
        ok: false,
        error: "RECENT_OUTCOMES_ROUTE_FAILED",
        message:
          error instanceof Error ? error.message : "Unknown recent outcomes route error.",
      },
      500
    );
  }
}