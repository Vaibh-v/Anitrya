import { KpiStrip } from "@/components/shared/KpiStrip";

type BannerCard = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  title: string;
  subtitle: string;
  cards: BannerCard[];
};

export function ReadinessBanner({ title, subtitle, cards }: Props) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/56">{subtitle}</p>
      </div>

      <div className="mt-5">
        <KpiStrip items={cards} />
      </div>
    </section>
  );
}