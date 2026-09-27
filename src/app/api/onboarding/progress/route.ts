import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUTO_SYNC_STAGES, stageWindow } from "@/lib/sync/auto-sync";

/**
 * GET /api/onboarding/progress?project=<slug>
 * Which staged windows (7 / 28 / 90 days) have landed for a new project, so
 * the first-run screen can open the dashboard the moment the 7-day view exists.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });

  const slug = request.nextUrl.searchParams.get("project") ?? "";
  const project = await prisma.project.findFirst({
    where: { workspaceId, slug },
    select: { slug: true, ga4PropertyId: true, gscSiteId: true },
  });
  if (!project) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });

  const needed = [project.ga4PropertyId ? "GOOGLE_GA4" : null, project.gscSiteId ? "GOOGLE_GSC" : null].filter(Boolean) as string[];
  const runs = await prisma.syncRun.findMany({
    where: {
      workspaceId,
      source: { in: ["GOOGLE_GA4", "GOOGLE_GSC"] },
      startedAt: { gte: new Date(Date.now() - 30 * 60_000) },
      metadata: { path: ["projectSlug"], equals: slug },
    },
    select: { source: true, status: true, rowsSynced: true, metadata: true },
    take: 50,
  });

  const stages = AUTO_SYNC_STAGES.map((days) => {
    const { from } = stageWindow(days);
    const done = needed.every((source) =>
      runs.some((run) => run.source === source && (run.metadata as Record<string, unknown> | null)?.from === from),
    );
    const rows = runs
      .filter((run) => (run.metadata as Record<string, unknown> | null)?.from === from)
      .reduce((total, run) => total + run.rowsSynced, 0);
    return { days, done, rows };
  });
  const errors = runs.filter((run) => run.status === "ERROR").map((run) => run.source);

  return NextResponse.json({ ok: true, needed, stages, errors: [...new Set(errors)] });
}
