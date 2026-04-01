import { NextResponse } from "next/server";
import { listRecentIntelligenceHistory } from "@/lib/intelligence/history-store";

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
    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 20;

    if (!workspaceId) {
      return json(
        {
          ok: false,
          error: "MISSING_WORKSPACE_ID",
          message: "workspaceId is required.",
        },
        400
      );
    }

    const rows = await listRecentIntelligenceHistory({
      workspaceId,
      projectSlug: projectSlug ?? undefined,
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
    console.error("RECENT_HISTORY_ROUTE_FAILED", error);

    return json(
      {
        ok: false,
        error: "RECENT_HISTORY_ROUTE_FAILED",
        message:
          error instanceof Error ? error.message : "Unknown recent history route error.",
      },
      500
    );
  }
}