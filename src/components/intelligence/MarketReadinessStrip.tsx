import { SurfaceMetricCard } from "@/components/shared/SurfaceMetricCard";

type CardData = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  cards: CardData[];
};

export function MarketReadinessStrip({ cards }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SurfaceMetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          context={card.context}
        />
      ))}
    </div>
  );
}