type Props = {
  label: string;
  value: string | number;
  context: string;
};

export function SurfaceMetricCard({ label, value, context }: Props) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/54">{context}</div>
    </div>
  );
}