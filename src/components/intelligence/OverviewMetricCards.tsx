import type { OverviewMetricCard } from "@/lib/intelligence/overview-safe";

type Props = {
  cards: OverviewMetricCard[];
};

export function OverviewMetricCards({ cards }: Props) {
  if (cards.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5">
        <div className="text-sm font-semibold text-white">No metric cards yet</div>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Sync and evidence processing need to populate headline metrics for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5"
        >
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
            {card.label}
          </div>

          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {card.value}
          </div>

          {card.delta ? (
            <div className="mt-2 text-sm text-cyan-200/80">{card.delta}</div>
          ) : null}

          {card.context ? (
            <div className="mt-2 text-sm text-white/50">{card.context}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}