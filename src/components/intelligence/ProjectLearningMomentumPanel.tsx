"use client";

type Props = {
  counts: {
    executionCount: number;
    outcomeCount: number;
    positiveOutcomeCount: number;
    warningCount: number;
  };
};

export function ProjectLearningMomentumPanel({ counts }: Props) {
  const positiveRate =
    counts.outcomeCount > 0
      ? Math.round((counts.positiveOutcomeCount / counts.outcomeCount) * 100)
      : 0;

  const warningRate =
    counts.outcomeCount > 0
      ? Math.round((counts.warningCount / counts.outcomeCount) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        Learning momentum
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs text-white/45">Positive rate</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {positiveRate}%
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs text-white/45">Warning rate</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {warningRate}%
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs text-white/45">Activity depth</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {counts.executionCount + counts.outcomeCount}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-white/50">
        This reflects whether the project is generating enough execution and outcome history
        to improve intelligence quality over time.
      </div>
    </div>
  );
}