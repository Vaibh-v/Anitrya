type Props = {
  label: string;
  value: string | number;
  context: string;
};

export function SurfaceMetricCard({ label, value, context }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{context}</div>
    </div>
  );
}