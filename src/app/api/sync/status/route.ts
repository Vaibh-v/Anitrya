import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();

    return NextResponse.json({
      ok: true,
      workspaceId: session.user?.workspaceId ?? null,
      syncRoute: "/api/sync/run",
      exportRoute: "/api/intelligence/export-customer-sheet",
      message:
        "Settings control actions are available. Run sync first, then export after evidence hydration.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load sync status.",
      },
      { status: error?.status ?? 500 }
    );
  }
}