"use client";

type Blocker = {
  label: string;
  reason: string;
};

export function BlockerListPanel({ blockers }: { blockers: Blocker[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        Confidence blockers
      </div>

      <div className="mt-3 space-y-3">
        {blockers.length > 0 ? (
          blockers.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="rounded-lg border border-amber-400/20 bg-amber-400/[0.08] p-3"
            >
              <div className="text-sm text-amber-100">{item.label}</div>
              <div className="mt-1 text-xs text-amber-50/80">{item.reason}</div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
            No blockers are currently recorded.
          </div>
        )}
      </div>
    </div>
  );
}