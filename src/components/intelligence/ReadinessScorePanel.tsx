"use client";

type Props = {
  score: number;
  learningUsed: boolean;
};

export function ReadinessScorePanel({ score, learningUsed }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Readiness score</div>
          <div className="text-2xl font-semibold text-white">
            {Math.round(score)}
          </div>
        </div>

        <div className="text-xs text-white/50">
          {learningUsed
            ? "Adjusted using historical execution performance"
            : "Not enough outcome data yet"}
        </div>
      </div>
    </div>
  );
}