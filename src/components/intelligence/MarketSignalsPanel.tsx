import { SectionCard } from "@/lib/intelligence/ui";
import type { FutureSourceSignal } from "@/lib/intelligence/future-sources";

type Props = {
  signals: FutureSourceSignal[];
};

function badgeClasses(state: FutureSourceSignal["state"]) {
  if (state === "connected") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (state === "preserved") {
    return "border-white/10 bg-white/[0.03] text-white/60";
  }
  return "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100";
}

export function MarketSignalsPanel({ signals }: Props) {
  return (
    <SectionCard
      title="Future market intelligence surface"
      subtitle="Preserved external-context layers that will later help Anitrya distinguish internal performance issues from market shifts, paid efficiency, and local-demand movement."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {signals.map((signal) => (
          <div
            key={signal.key}
            className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">{signal.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                  {signal.category}
                </div>
              </div>

              <div
                className={`rounded-full border px-2.5 py-1 text-xs ${badgeClasses(
                  signal.state
                )}`}
              >
                {signal.currentStateLabel}
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/62">{signal.uiSummary}</p>

            <div className="mt-4 rounded-[14px] border border-white/10 bg-black/16 px-3 py-3 text-sm text-white/72">
              {signal.intelligenceRole}
            </div>

            <div className="mt-4 text-sm text-white/52">{signal.nextUnlock}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}