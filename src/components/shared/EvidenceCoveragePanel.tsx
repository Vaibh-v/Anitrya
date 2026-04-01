"use client";

type CoverageCard = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  title: string;
  description: string;
  cards: CoverageCard[];
};

export function EvidenceCoveragePanel({
  title,
  description,
  cards,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-black/16 p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{card.value}</div>
            <div className="mt-2 text-sm leading-6 text-white/60">{card.context}</div>
          </div>
        ))}
      </div>
    </div>
  );
}