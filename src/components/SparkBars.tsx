type SparkBarsProps = {
  values: number[];
  height?: number;
};

export function SparkBars({ values, height = 72 }: SparkBarsProps) {
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(...safeValues, 1);

  return (
    <div
      className="flex items-end gap-1 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
      style={{ height }}
    >
      {safeValues.map((value, index) => {
        const barHeight = Math.max((value / max) * (height - 24), 6);

        return (
          <div
            key={`${value}-${index}`}
            className="flex-1 rounded-full bg-[linear-gradient(180deg,rgba(118,180,255,0.95)_0%,rgba(76,222,196,0.78)_100%)] shadow-[0_0_18px_rgba(76,222,196,0.16)]"
            style={{ height: `${barHeight}px` }}
            title={String(value)}
          />
        );
      })}
    </div>
  );
}