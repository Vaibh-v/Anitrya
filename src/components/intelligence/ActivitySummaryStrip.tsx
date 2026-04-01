"use client";

type Props = {
  counts: {
    executionCount: number;
    outcomeCount: number;
    positiveOutcomeCount: number;
    warningCount: number;
  };
};

export function ActivitySummaryStrip({ counts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Execution updates
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">
          {counts.executionCount}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Outcomes recorded
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">
          {counts.outcomeCount}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Positive outcomes
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">
          {counts.positiveOutcomeCount}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Warning signals
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">
          {counts.warningCount}
        </div>
      </div>
    </div>
  );
}