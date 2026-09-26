import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveSelectedProject, listWorkspaceProjects } from "@/lib/projects/resolve-selected-project";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getOverviewEvidenceSummary } from "@/lib/evidence/normalized-overview-store";
import { getBehaviorDetail, getSeoDetail } from "@/lib/evidence/page-insights";
import { buildProjectIntegrationHealth } from "@/lib/integrations/project-integration-health";
import { listSyncHealthRuns } from "@/lib/sync/sync-health-history";
import { getProjectEvidenceBundle } from "@/lib/intelligence/project-evidence";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";

/** Temporary, read-only, session-scoped timing probe for the performance work. */
export async function GET(request: NextRequest) {
  const t0 = Date.now();
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const slug = request.nextUrl.searchParams.get("project") ?? "clara-ai";
  const to = new Date().toISOString().slice(0, 10);
  const f = new Date(); f.setUTCDate(f.getUTCDate() - 29);
  const from = f.toISOString().slice(0, 10);
  const timings: Record<string, number | string> = { session: Date.now() - t0 };

  async function time<T>(name: string, fn: () => Promise<T>) {
    const s = Date.now();
    try { const v = await fn(); timings[name] = Date.now() - s; return v; }
    catch (e) { timings[name] = `err ${Date.now() - s}ms ${e instanceof Error ? e.message.slice(0, 80) : ""}`; return null; }
  }

  await time("ping", () => prisma.$queryRawUnsafe("SELECT 1"));
  await time("ping2", () => prisma.$queryRawUnsafe("SELECT 1"));
  await time("resolveSelectedProject", () => resolveSelectedProject({ workspaceId, projectSlug: slug }));
  await time("listWorkspaceProjects", () => listWorkspaceProjects(workspaceId));
  const mapping = await time("getProjectMapping", () => getProjectMapping({ ref: slug, workspaceId }));
  await time("overviewSummary", () => getOverviewEvidenceSummary({ workspaceId, projectId: slug, from, to }));
  await time("seoDetail", () => getSeoDetail({ workspaceId, projectSlug: slug, from, to }));
  await time("behaviorDetail", () => getBehaviorDetail({ workspaceId, projectSlug: slug, from, to }));
  await time("integrationHealth", () => buildProjectIntegrationHealth({ workspaceId, projectId: slug }));
  await time("syncHealthRuns", () => listSyncHealthRuns({ workspaceId, projectSlug: slug, take: 5 }));
  await time("syncRun80", () => prisma.syncRun.findMany({ where: { workspaceId }, orderBy: { startedAt: "desc" }, take: 80, select: { metadata: true } }));
  const bundle = await time("evidenceBundle", () => getProjectEvidenceBundle({ workspaceId, projectSlug: slug, from, to }));
  timings.bundleRows = bundle ? Object.values(bundle).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0) : 0;
  if (mapping) {
    await time("runIntelligence", () => runIntelligence({ workspaceId, projectId: mapping.projectId, projectSlug: mapping.projectSlug, projectLabel: mapping.projectLabel, from, to }));
  }
  timings.total = Date.now() - t0;
  timings.region = process.env.VERCEL_REGION ?? "unknown";
  try {
    // Hostname only (no credentials) so the database region can be matched.
    timings.dbHost = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    timings.dbHost = "unparseable";
  }
  const version = await prisma.$queryRawUnsafe<Array<{ v: string }>>("SELECT version() AS v").catch(() => []);
  timings.dbVersion = version[0]?.v?.slice(0, 60) ?? "";
  return NextResponse.json(timings);
}
