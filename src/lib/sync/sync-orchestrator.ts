import { requireSession } from "@/lib/auth";
import { runGA4Sync } from "@/lib/sync/runners/ga4-runner";
import { runGSCSync } from "@/lib/sync/runners/gsc-runner";

type RunFullSyncInput = {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  sources: string[];
};

export async function runFullSync(input: RunFullSyncInput) {
  const session = await requireSession();
  const normalizedSources = new Set(input.sources);

  const results = [];

  if (normalizedSources.has("google_ga4")) {
    results.push(
      await runGA4Sync({
        session,
        workspaceId: input.workspaceId,
        projectSlug: input.projectSlug,
        from: input.from,
        to: input.to,
      })
    );
  }

  if (normalizedSources.has("google_gsc")) {
    results.push(
      await runGSCSync({
        session,
        workspaceId: input.workspaceId,
        projectSlug: input.projectSlug,
        from: input.from,
        to: input.to,
      })
    );
  }

  return {
    totalRowsProcessed: results.reduce((sum, item) => sum + item.rows, 0),
    sourcesRun: results.map((item) => item.source),
    results,
  };
}