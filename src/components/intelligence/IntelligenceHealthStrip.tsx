"use client";

type HealthStat = {
  label: string;
  value: number | string;
  context: string;
};

export function IntelligenceHealthStrip({
  stats,
}: {
  stats: HealthStat[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            {stat.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {stat.value}
          </div>
          <div className="mt-2 text-xs leading-5 text-white/50">
            {stat.context}
          </div>
        </div>
      ))}
    </div>
  );
}