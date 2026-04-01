import { SectionCard } from "@/lib/intelligence/ui";
import type { FutureSourceSignal } from "@/lib/intelligence/future-sources";
import type {
  FutureSourceSummary,
  FutureSourceSummaryCard,
  FutureSourceCategoryBlock,
} from "@/lib/intelligence/future-source-summary";

type Props = {
  summary: FutureSourceSummary;
  signals: FutureSourceSignal[];
};

function prettyCategory(value: "core" | "expansion" | "market") {
  if (value === "core") return "Core";
  if (value === "expansion") return "Expansion";
  return "Market";
}

function badgeClasses(state: FutureSourceSignal["state"]) {
  if (state === "connected") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (state === "preserved") {
    return "border-white/10 bg-white/[0.03] text-white/60";
  }
  return "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100";
}

export function ExpansionReadinessPanel({ summary, signals }: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Expansion readiness"
        subtitle="The preserved connector surface for Google Business Profile, Google Ads, Google Trends, and future market-context layers."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.cards.map((card: FutureSourceSummaryCard) => (
            <div
              key={card.label}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-white/50">{card.context}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Readiness by category"
          subtitle="How the intelligence system is staged across current, expansion, and market-context layers."
        >
          <div className="space-y-4">
            {summary.categories.map((item: FutureSourceCategoryBlock) => (
              <div
                key={item.category}
                className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {prettyCategory(item.category)}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                      {item.total} surfaces
                    </div>
                  </div>

                  <div className="text-right text-xs text-white/50">
                    <div>Connected: {item.connected}</div>
                    <div>Preserved: {item.preserved}</div>
                    <div>Planned: {item.planned}</div>
                  </div>
                </div>

                <div className="mt-4 text-sm leading-6 text-white/56">
                  {item.topLabels.join(", ") || "No surfaces yet"}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Expansion surfaces"
          subtitle="Preserved integrations that will extend the same normalized reasoning layer without changing system contracts."
        >
          <div className="space-y-4">
            {signals.map((signal: FutureSourceSignal) => (
              <div
                key={signal.key}
                className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{signal.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                      {prettyCategory(signal.category)}
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

                <div className="mt-4 rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Intelligence role
                  </div>
                  <div className="mt-2 text-sm text-white/72">{signal.intelligenceRole}</div>
                </div>

                <div className="mt-4 text-sm text-white/52">{signal.nextUnlock}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}