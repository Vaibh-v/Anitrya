import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId ?? null;
    const recentRuns = workspaceId
      ? await prisma.syncRun.findMany({
          where: { workspaceId },
          orderBy: { startedAt: "desc" },
          take: 12,
          select: {
            id: true,
            source: true,
            status: true,
            rowsSynced: true,
            error: true,
            metadata: true,
            startedAt: true,
            endedAt: true,
          },
        })
      : [];

    return NextResponse.json({
      ok: true,
      workspaceId,
      syncRoute: "/api/sync/run",
      exportRoute: "/api/intelligence/export-customer-sheet",
      recentRuns,
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
