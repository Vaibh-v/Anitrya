import { SectionCard } from "@/lib/intelligence/ui";
import type { OverviewTrendBlock } from "@/lib/intelligence/overview-safe";

type Props = {
  trends: OverviewTrendBlock[];
};

function maxValue(points: { value: number }[]) {
  return Math.max(1, ...points.map((point) => point.value));
}

export function OverviewTrendPanel({ trends }: Props) {
  return (
    <SectionCard
      title="Overview trend evidence"
      subtitle="Daily movement across the strongest currently available top-line signals."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {trends.map((trend) => {
          const highest = maxValue(trend.points);

          return (
            <div
              key={trend.key}
              className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-semibold text-white">{trend.title}</div>
              <div className="mt-1 text-sm leading-6 text-white/52">{trend.subtitle}</div>

              {trend.points.length === 0 ? (
                <div className="mt-4 rounded-[16px] border border-dashed border-white/10 bg-black/16 p-4">
                  <div className="text-sm font-semibold text-white">No trend data yet</div>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Trend evidence for this section has not been populated for the current range.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {trend.points.slice(-8).map((point) => {
                    const width = `${Math.max(8, (point.value / highest) * 100)}%`;

                    return (
                      <div
                        key={`${trend.key}-${point.date}`}
                        className="rounded-[16px] border border-white/10 bg-black/16 p-3"
                      >
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          {point.date}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {point.value}
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-white/5">
                          <div
                            className="h-1.5 rounded-full bg-cyan-300/85"
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}