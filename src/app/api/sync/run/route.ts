import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { recordManualSyncRun } from "@/lib/sync/sync-run-recorder";
import { runFullSync } from "@/lib/sync/sync-orchestrator";

type RequestBody = {
  workspaceId?: string | null;
  projectSlug?: string | null;
  projectId?: string | null;
  from?: string | null;
  to?: string | null;
  sources?: string[] | null;
};

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as RequestBody;

    const sessionWorkspaceId = session.user?.workspaceId ?? null;

    if (!sessionWorkspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context." },
        { status: 401 }
      );
    }

    if (body.workspaceId && body.workspaceId !== sessionWorkspaceId) {
      return NextResponse.json(
        { error: "Workspace mismatch for sync request." },
        { status: 403 }
      );
    }

    const resolvedProjectSlug = body.projectSlug ?? body.projectId ?? null;

    if (!resolvedProjectSlug) {
      return NextResponse.json(
        { error: "Project slug is required for entity sync." },
        { status: 400 }
      );
    }

    const summary = await runFullSync({
      workspaceId: sessionWorkspaceId,
      projectSlug: resolvedProjectSlug,
      from: body.from ?? "",
      to: body.to ?? "",
      sources: body.sources ?? ["google_ga4", "google_gsc"],
    });

    await recordManualSyncRun({
      workspaceId: sessionWorkspaceId,
      source: "google_ga4",
      status: "success",
      rowsSynced: summary.totalRowsProcessed,
      meta: {
        projectSlug: resolvedProjectSlug,
        from: body.from ?? "",
        to: body.to ?? "",
        sources: body.sources ?? ["google_ga4", "google_gsc"],
      },
    });

    return NextResponse.json({
      ok: true,
      run: {
        projectSlug: resolvedProjectSlug,
        totalRowsProcessed: summary.totalRowsProcessed,
        message:
          "Sync completed. Data ingestion layer executed. Evidence will hydrate once normalized.",
      },
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message ?? "Entity sync failed.",
      },
      { status: error?.status ?? 500 }
    );
  }
}