import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { runFullSync } from "@/lib/sync/sync-orchestrator";
import { recordManualSyncRun } from "@/lib/sync/sync-run-recorder";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context on the current session." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      project?: string;
      projectId?: string;
      projectSlug?: string;
      from?: string;
      to?: string;
    };

    const projectRef =
      body.projectSlug?.trim() ||
      body.projectId?.trim() ||
      body.project?.trim() ||
      "";

    const from = body.from?.trim() || "";
    const to = body.to?.trim() || "";

    if (!projectRef || !from || !to) {
      return NextResponse.json(
        {
          error:
            "project, from, and to are required. The sync request payload is incomplete.",
        },
        { status: 400 }
      );
    }

    const result = await runFullSync({
      workspaceId,
      projectRef,
      from,
      to,
    });

    const totalRowsSynced = result.results.reduce((sum: number, item) => {
      return item.status === "success" ? sum + (item.rowsSynced ?? 0) : sum;
    }, 0);

    await recordManualSyncRun({
      workspaceId,
      source: "GOOGLE_GA4",
      status: "success",
      rowsSynced: totalRowsSynced,
      meta: {
        projectRef,
        projectSlug: result.projectSlug,
        from,
        to,
        providers: result.results,
      },
      error: null,
    });

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      rowsSynced: totalRowsSynced,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed.",
      },
      { status: 500 }
    );
  }
}