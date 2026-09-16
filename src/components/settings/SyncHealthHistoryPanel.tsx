import type { SyncHealthRunView } from "@/lib/sync/sync-health-history";

type Props = {
  runs: SyncHealthRunView[];
};

function stateClasses(state: SyncHealthRunView["state"]) {
  if (state === "success") {
    return "border-emerald-300/20 bg-emerald-300/8 text-emerald-100";
  }

  if (state === "error") {
    return "border-rose-300/24 bg-rose-300/10 text-rose-100";
  }

  return "border-amber-300/20 bg-amber-300/8 text-amber-100";
}

export function SyncHealthHistoryPanel({ runs }: Props) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,27,64,0.88),rgba(5,15,39,0.94))] px-8 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[30px] font-semibold tracking-[-0.03em] text-white">
            Sync health history
          </h2>
          <p className="mt-3 text-[17px] leading-8 text-white/66">
            Recent project sync runs with source status, owner export, intelligence export,
            and next actions.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/4 px-5 py-3 text-[15px] text-white/72">
          {runs.length} recent
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-5">
          <div className="text-[16px] font-semibold text-white">No health runs yet</div>
          <p className="mt-2 text-[15px] leading-7 text-white/58">
            Run entity sync once to create the first health record for this project.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-[24px] border border-white/10 bg-black/12 px-5 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-[12px] uppercase tracking-[0.16em] ${stateClasses(
                        run.state,
                      )}`}
                    >
                      {run.state}
                    </span>
                    <span className="text-[14px] text-white/52">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 text-[18px] font-semibold text-white">
                    {run.projectLabel}
                  </div>
                  <div className="mt-1 text-[14px] text-white/48">
                    {run.from} to {run.to}
                  </div>
                </div>

                <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Rows
                  </div>
                  <div className="mt-1 text-[18px] font-semibold text-white">
                    {run.totalRowsSynced}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[15px] leading-7 text-white/62">
                {run.summary}
              </p>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Sources
                  </div>
                  <div className="mt-3 space-y-2">
                    {run.sources.map((source) => (
                      <div
                        key={`${run.id}-${source.provider}`}
                        className="text-[14px] leading-6 text-white/66"
                      >
                        <span className="font-medium text-white/88">
                          {source.provider}
                        </span>
                        {": "}
                        {source.status} ({source.rowsSynced})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Owner export
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-white">
                    {run.ownerSheet?.label ?? run.ownerSheet?.status ?? "Not reported"}
                  </div>
                  <div className="mt-2 text-[14px] leading-6 text-white/58">
                    {run.ownerSheet?.detail ?? run.ownerSheet?.reason ?? "No detail recorded."}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Intelligence
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-white">
                    {run.intelligence?.status === "generated"
                      ? `${run.intelligence.insights ?? 0} insight(s), ${
                          run.intelligence.recommendations ?? 0
                        } recommendation(s)`
                      : run.intelligence?.status === "error"
                        ? "Generation failed"
                        : "Not reported"}
                  </div>
                  <div className="mt-2 text-[14px] leading-6 text-white/58">
                    Export: {run.intelligence?.exportStatus ?? "not run"}
                  </div>
                </div>
              </div>

              {run.nextActions.length > 0 ? (
                <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-300/8 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-amber-100/70">
                    Next actions
                  </div>
                  <div className="mt-3 grid gap-2 lg:grid-cols-3">
                    {run.nextActions.map((action) => (
                      <div key={action} className="text-[14px] leading-6 text-amber-50/86">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
