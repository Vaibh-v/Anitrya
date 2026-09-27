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
  if (request.nextUrl.searchParams.get("storage") === "1") {
    // Read-only storage diagnostics for the Neon 512 MB limit.
    timings.dbSize = await prisma.$queryRawUnsafe<Array<{ size: string }>>("SELECT pg_size_pretty(pg_database_size(current_database())) AS size")
      .then((r) => r[0]?.size ?? "").catch((e) => `err ${e instanceof Error ? e.message.slice(0, 80) : ""}`);
    timings.tables = JSON.stringify(await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT relname AS t, pg_size_pretty(pg_total_relation_size(relid)) AS total, n_live_tup::bigint AS live, n_dead_tup::bigint AS dead
       FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 15`,
    ).then((rows) => rows.map((r) => ({ ...r, live: String(r.live), dead: String(r.dead) }))).catch((e) => String(e).slice(0, 120)));
    timings.gscDupes = JSON.stringify(await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT project_slug, COUNT(*)::bigint AS rows, COUNT(DISTINCT (CAST(date AS TEXT), query))::bigint AS distinct_rows,
              MIN(CAST(date AS TEXT)) AS first, MAX(CAST(date AS TEXT)) AS last
       FROM gsc_query_daily GROUP BY project_slug ORDER BY 2 DESC`,
    ).then((rows) => rows.map((r) => ({ ...r, rows: String(r.rows), distinct_rows: String(r.distinct_rows) }))).catch((e) => String(e).slice(0, 120)));
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
