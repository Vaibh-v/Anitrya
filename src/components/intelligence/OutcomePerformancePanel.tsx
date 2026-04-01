import { SectionCard } from "@/lib/intelligence/ui";
import type { OutcomeSummary } from "@/lib/intelligence/outcome-summary";

type Props = {
  summary: OutcomeSummary;
};

function prettyStatus(value: string) {
  return value.replace(/_/g, " ");
}

export function OutcomePerformancePanel({ summary }: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Recommendation feedback loop"
        subtitle="How recorded recommendation outcomes are trending for this project. This is the first layer of self-learning reliability."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-white/50">{card.context}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <SectionCard
          title="Outcome status mix"
          subtitle="Distribution of how recommendations performed after human feedback."
        >
          <div className="space-y-3">
            {summary.byStatus.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="text-sm text-white/72 capitalize">
                  {prettyStatus(item.status)}
                </div>
                <div className="text-sm font-semibold text-white">{item.count}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recommendation reliability"
          subtitle="Which recommendation patterns are getting the strongest positive follow-through."
        >
          {summary.rollups.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
              <div className="text-sm font-medium text-white">No recommendation outcomes yet</div>
              <p className="mt-2 text-sm leading-6 text-white/52">
                Once outcomes are recorded, this panel will show which recommendations are consistently producing better real-world results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {summary.rollups.slice(0, 8).map((item) => (
                <div
                  key={`${item.hypothesisTitle}-${item.recommendationTitle}`}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {item.recommendationTitle}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">
                        {item.hypothesisTitle}
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/56">
                      {item.latestStatus.replace(/_/g, " ")}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Total
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">{item.total}</div>
                    </div>

                    <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Positive
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">{item.positive}</div>
                    </div>

                    <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Negative
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">{item.negative}</div>
                    </div>

                    <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Avg impact
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {item.avgImpact >= 0 ? "+" : ""}
                        {item.avgImpact.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}