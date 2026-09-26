/**
 * Instant Insight background sync. Triggered once when a signed-in user opens
 * the app; never blocks the page. For every project in the workspace it runs
 * staged windows — 7 days, then 28, then 90 — so the dashboard is useful after
 * the first seconds and complete within about a minute. Every project and
 * provider in a stage runs concurrently (bounded), then the owner export and
 * intelligence export run last, invisibly.
 */
import { prisma } from "@/lib/prisma";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { runProjectIntegrationSyncs } from "@/lib/integrations/run-project-integration-syncs";
import type { IntegrationSyncProvider } from "@/lib/integrations/sync-contracts";
import { exportNormalizedProjectDataToOwnerSheet } from "@/lib/intelligence/owner-network/export-normalized-project-data";
import { exportIntelligenceToSheets } from "@/lib/intelligence/owner-network/export-intelligence-to-sheets";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";

export const AUTO_SYNC_STAGES = [7, 28, 90] as const;
const FRESH_HOURS = 6;
const CONCURRENCY = 4;
const PROVIDERS: IntegrationSyncProvider[] = ["GOOGLE_GA4", "GOOGLE_GSC", "GOOGLE_ADS", "GOOGLE_GBP"];

export function stageWindow(days: number, today = new Date()) {
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Runs tasks with at most `limit` in flight. */
export async function pool<T>(tasks: Array<() => Promise<T>>, limit = CONCURRENCY): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/** Projects whose GA4/GSC evidence has not been refreshed (90-day stage) in the last FRESH_HOURS. */
export async function projectsNeedingSync(workspaceId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: { workspaceId, OR: [{ ga4PropertyId: { not: null } }, { gscSiteId: { not: null } }] },
    select: { slug: true },
  });
  if (projects.length === 0) return [];

  const since = new Date(Date.now() - FRESH_HOURS * 3600_000);
  const recent = await prisma.syncRun.findMany({
    where: { workspaceId, startedAt: { gte: since }, status: "SUCCESS", source: { in: ["GOOGLE_GA4", "GOOGLE_GSC"] } },
    select: { metadata: true },
    take: 400,
  });
  const fullWindowFrom = stageWindow(AUTO_SYNC_STAGES[AUTO_SYNC_STAGES.length - 1]).from;
  const fresh = new Set<string>();
  for (const run of recent) {
    const meta = (run.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.projectSlug === "string" && typeof meta.from === "string" && meta.from <= fullWindowFrom) {
      fresh.add(meta.projectSlug);
    }
  }
  return projects.map((p) => p.slug).filter((slug) => !fresh.has(slug));
}

function ownerSheetConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim() && process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim());
}

export async function runAutoSync(workspaceId: string, slugs: string[]) {
  const started = Date.now();
  const mappings = (
    await Promise.all(slugs.map((ref) => getProjectMapping({ workspaceId, ref }).catch(() => null)))
  ).filter((m): m is NonNullable<typeof m> => Boolean(m));

  for (const days of AUTO_SYNC_STAGES) {
    const { from, to } = stageWindow(days);
    const tasks = mappings.flatMap((mapping) =>
      PROVIDERS.map((provider) => () =>
        runProjectIntegrationSyncs({ workspaceId, mapping, from, to }, provider).catch((error) => {
          console.error("AUTO_SYNC_TASK_FAILED", mapping.projectSlug, provider, error instanceof Error ? error.message : error);
          return [];
        }),
      ),
    );
    await pool(tasks);
    console.info("AUTO_SYNC_STAGE_DONE", { workspaceId, days, projects: mappings.length, ms: Date.now() - started });
  }

  // Invisible exports: nothing here is surfaced to the customer.
  if (!ownerSheetConfigured()) return;
  const { from, to } = stageWindow(28);
  await pool(
    mappings.map((mapping) => async () => {
      try {
        await exportNormalizedProjectDataToOwnerSheet({
          workspaceId: mapping.workspaceId,
          projectId: mapping.projectId,
          projectSlug: mapping.projectSlug,
          projectLabel: mapping.projectLabel,
          ga4PropertyRecordId: mapping.ga4PropertyRecordId,
          ga4PropertyId: mapping.ga4PropertyId,
          ga4PropertyLabel: mapping.ga4PropertyLabel,
          gscSiteRecordId: mapping.gscSiteRecordId,
          gscSiteUrl: mapping.gscSiteUrl,
          from,
          to,
          results: [],
        });
        const output = await runIntelligence({
          workspaceId: mapping.workspaceId,
          projectId: mapping.projectId,
          projectSlug: mapping.projectSlug,
          projectLabel: mapping.projectLabel,
          from,
          to,
        });
        await exportIntelligenceToSheets({
          run: {
            workspaceId: mapping.workspaceId,
            projectId: mapping.projectId,
            projectSlug: mapping.projectSlug,
            projectLabel: mapping.projectLabel,
            from,
            to,
          },
          output,
        });
      } catch (error) {
        console.error("AUTO_OWNER_EXPORT_FAILED", mapping.projectSlug, error instanceof Error ? error.message : error);
      }
    }),
    2,
  );
}

const LOCK_SLUG = "__auto_sync__";
const LOCK_MINUTES = 5;

/** Lightweight per-workspace claim so repeated logins don't start overlapping runs. */
export async function claimAutoSync(workspaceId: string): Promise<string | null> {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const running = await prisma.syncHealthRun.findFirst({
    where: { workspaceId, projectSlug: LOCK_SLUG, state: "running", createdAt: { gte: since } },
    select: { id: true },
  });
  if (running) return null;
  const claim = await prisma.syncHealthRun.create({
    data: {
      workspaceId,
      projectSlug: LOCK_SLUG,
      projectLabel: "Background sync",
      state: "running",
      from: stageWindow(90).from,
      to: stageWindow(90).to,
      sources: [] as never,
      summary: "Background sync started",
    },
    select: { id: true },
  });
  return claim.id;
}

export async function releaseAutoSync(claimId: string, summary: string) {
  await prisma.syncHealthRun
    .update({ where: { id: claimId }, data: { state: "done", summary } })
    .catch(() => undefined);
}

export async function isAutoSyncRunning(workspaceId: string) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const running = await prisma.syncHealthRun.findFirst({
    where: { workspaceId, projectSlug: LOCK_SLUG, state: "running", createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(running);
}
