"use client";

export function SourceCoveragePanel({
  evidenceCount,
  missingCount,
}: {
  evidenceCount: number;
  missingCount: number;
}) {
  const coverageLabel =
    missingCount === 0 ? "healthy" : missingCount <= 2 ? "partial" : "blocked";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">Source coverage</div>
          <div className="mt-2 text-sm text-white/60">
            A quick read on how much structured evidence is available versus still missing.
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
          {coverageLabel}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Evidence available
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{evidenceCount}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Sources missing
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{missingCount}</div>
        </div>
      </div>
    </div>
  );
}