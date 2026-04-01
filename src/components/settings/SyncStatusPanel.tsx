import { SectionCard } from "@/lib/intelligence/ui";
import { KpiStrip } from "@/components/shared/KpiStrip";
import type { SyncStatusSummary } from "@/lib/sync/sync-orchestrator-contracts";

type Props = {
  summary: SyncStatusSummary;
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
};

export function SyncStatusPanel({
  summary,
  projectId,
  projectLabel,
  hasProject,
}: Props) {
  const latest = summary.latestRun;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Sync status"
        subtitle="Current sync state and recent execution history for this project."
      >
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Selected project
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {hasProject ? projectLabel : "No project selected"}
            </div>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Project ID
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {hasProject ? projectId : "Unavailable"}
            </div>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Control state
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {hasProject ? "Project active" : "Project required"}
            </div>
          </div>
        </div>

        <KpiStrip
          items={[
            {
              label: "Current state",
              value: summary.currentState,
              context: "Latest known execution state for this project",
            },
            {
              label: "Latest rows",
              value: latest?.totalRowsProcessed ?? 0,
              context: "Total rows processed by the latest sync run",
            },
            {
              label: "Latest sources",
              value: latest?.sources.length ?? 0,
              context: "Sources included in the latest recorded run",
            },
            {
              label: "Recent runs",
              value: summary.recentRuns.length,
              context: "Stored sync history visible for this project",
            },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Recent sync ledger"
        subtitle="Most recent sync execution history for the selected project."
      >
        {summary.recentRuns.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
            <div className="text-sm font-semibold text-white">No sync history yet</div>
            <p className="mt-2 text-sm leading-6 text-white/52">
              {hasProject
                ? `Run a manual sync to create the first execution record for ${projectLabel}.`
                : "Resolve a project to begin recording sync history."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.recentRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {run.state.toUpperCase()}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/38">
                      {run.projectSlug}
                    </div>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/65">
                    {run.totalRowsProcessed} rows
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/58">{run.message}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                      Started
                    </div>
                    <div className="mt-2 text-sm text-white/72">
                      {new Date(run.startedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                      Ended
                    </div>
                    <div className="mt-2 text-sm text-white/72">
                      {run.endedAt ? new Date(run.endedAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                      Sources
                    </div>
                    <div className="mt-2 text-sm text-white/72">
                      {run.sources.join(", ")}
                    </div>
                  </div>
                </div>

                {run.sourceResults.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {run.sourceResults.map((result) => (
                      <div
                        key={`${run.id}-${result.source}`}
                        className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-sm font-medium text-white">
                            {result.source}
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/65">
                            {result.rowsProcessed} rows
                          </div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/58">
                          {result.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}