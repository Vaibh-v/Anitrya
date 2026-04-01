import { SectionCard } from "@/lib/intelligence/ui";
import type { OverviewEvidenceRow } from "@/lib/intelligence/overview-safe";

type Props = {
  rows: OverviewEvidenceRow[];
};

export function OverviewEvidenceTable({ rows }: Props) {
  return (
    <SectionCard
      title="Overview evidence table"
      subtitle="Structured evidence rows for the latest available overview metrics."
    >
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-white">No overview evidence rows yet</div>
          <p className="mt-2 text-sm leading-6 text-white/52">
            Overview evidence will appear here once synced evidence resolves into the current range.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-white/38">
                <th className="px-3 py-2 font-medium">Dimension</th>
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.metric}-${row.context}-${index}`}
                  className="rounded-2xl bg-white/[0.03] text-sm text-white/72"
                >
                  <td className="rounded-l-2xl px-3 py-3">{row.dimension}</td>
                  <td className="px-3 py-3">{row.metric}</td>
                  <td className="px-3 py-3">{row.value}</td>
                  <td className="rounded-r-2xl px-3 py-3">{row.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}