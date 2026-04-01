type KpiItem = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  items: KpiItem[];
};

export function KpiStrip({ items }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
            {item.label}
          </div>

          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {item.value}
          </div>

          <div className="mt-2 text-sm leading-6 text-white/54">
            {item.context}
          </div>
        </div>
      ))}
    </div>
  );
}