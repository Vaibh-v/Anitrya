"use client";

type StatCard = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  items: StatCard[];
  columns?: 2 | 3 | 4;
};

export function SectionStatCards({ items, columns = 4 }: Props) {
  const gridClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            {item.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
          <div className="mt-2 text-sm leading-6 text-white/60">{item.context}</div>
        </div>
      ))}
    </div>
  );
}