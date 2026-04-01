type Stat = {
  label: string;
  value: string | number;
  context: string;
};

type Props = {
  title: string;
  description: string;
  stats: Stat[];
};

export function SettingsHealthPanel({
  title,
  description,
  stats,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-black/16 p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {stat.value}
            </div>
            <div className="mt-2 text-sm leading-6 text-white/60">
              {stat.context}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}