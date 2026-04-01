import { SectionCard } from "@/lib/intelligence/ui";
import type { HistorySummary } from "@/lib/intelligence/history-summary";

type Props = {
  summary: HistorySummary;
};

function prettyCategory(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function HistoryInsightsPanel({ summary }: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Memory summary"
        subtitle="A compact view of what the system has already learned and persisted from recent project diagnostics."
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Memory timeline"
          subtitle="How many persisted reads were written per day, including confidence split."
        >
          {summary.timeline.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
              <div className="text-sm font-medium text-white">No memory timeline yet</div>
              <p className="mt-2 text-sm leading-6 text-white/52">
                Persisted intelligence snapshots will appear here once the project accumulates more reads over time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.timeline.slice(-10).map((point) => (
                <div
                  key={point.date}
                  className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{point.date}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">
                        {point.total} entries
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/50">
                      <div>High: {point.high}</div>
                      <div>Medium: {point.medium}</div>
                      <div>Low: {point.low}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Category rollup"
          subtitle="Which reasoning categories are being populated most often and what they most recently concluded."
        >
          {summary.categories.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
              <div className="text-sm font-medium text-white">No category rollup yet</div>
              <p className="mt-2 text-sm leading-6 text-white/52">
                Category rollups will appear here as persisted intelligence records accumulate.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {summary.categories.map((item) => (
                <div
                  key={item.category}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {prettyCategory(item.category)}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">
                        {item.count} total entries
                      </div>
                    </div>

                    <div className="text-right text-xs text-white/50">
                      <div>High: {item.high}</div>
                      <div>Medium: {item.medium}</div>
                      <div>Low: {item.low}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[16px] border border-white/10 bg-black/16 p-4">
                    <div className="text-sm font-medium text-white">
                      {item.latestTitle || "No latest title"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      {item.latestSummary || "No latest summary."}
                    </p>
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