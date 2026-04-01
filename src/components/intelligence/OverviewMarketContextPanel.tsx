import { SectionCard } from "@/lib/intelligence/ui";
import type { FutureReadinessPanelData } from "@/lib/intelligence/future-readiness";

type Props = {
  data: FutureReadinessPanelData;
};

export function OverviewMarketContextPanel({ data }: Props) {
  return (
    <SectionCard
      title="Future market context"
      subtitle="Preserved intelligence layers for Google Business Profile, Google Ads, Google Trends, and competitive market context."
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
            <div className="mt-2 text-sm text-white/52">{card.context}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}