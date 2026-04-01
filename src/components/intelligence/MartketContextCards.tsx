import { SectionCard } from "@/lib/intelligence/ui";
import type { FutureReadinessPanelData } from "@/lib/intelligence/future-readiness";

type MarketContextCardsProps = {
  data: FutureReadinessPanelData;
};

export function MarketContextCards({
  data,
}: MarketContextCardsProps) {
  return (
    <SectionCard
      title="Market-context readiness"
      subtitle="Prepared external and expansion layers that will strengthen intelligence beyond GA4 and Search Console."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
              {card.label}
            </div>

            <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {card.value}
            </div>

            <div className="mt-2 text-sm leading-6 text-white/52">
              {card.context}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}