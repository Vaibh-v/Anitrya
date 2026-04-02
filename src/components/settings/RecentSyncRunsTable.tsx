type SyncRunRow = {
  id: string;
  source: string;
  status: string;
  rowsSynced: number | null;
  startedAt: Date;
  endedAt: Date | null;
};

type Props = {
  runs: SyncRunRow[];
};

export function RecentSyncRunsTable({ runs }: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">Recent sync runs</div>
      <div className="mt-2 text-sm leading-6 text-white/60">
        Most recent operational executions across connected sources.
      </div>

      {runs.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-white">No sync runs yet</div>
          <div className="mt-2 text-sm leading-6 text-white/60">
            Run sync from the operational controls above to populate the execution ledger.
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-white/38">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Ended</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="bg-white/[0.03] text-sm text-white/72"
                >
                  <td className="rounded-l-2xl px-3 py-3">{run.source}</td>
                  <td className="px-3 py-3">{run.status}</td>
                  <td className="px-3 py-3">{run.rowsSynced ?? "—"}</td>
                  <td className="px-3 py-3">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                  <td className="rounded-r-2xl px-3 py-3">
                    {run.endedAt ? new Date(run.endedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}