type CountCard = {
  label: string;
  value: string | number;
  body: string;
};

type Props = {
  title: string;
  subtitle: string;
  cards: CountCard[];
};

export function EvidenceCountGrid({ title, subtitle, cards }: Props) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/56">{subtitle}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[18px] border border-white/10 bg-black/16 p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {card.value}
            </div>
            <p className="mt-2 text-sm leading-6 text-white/56">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}