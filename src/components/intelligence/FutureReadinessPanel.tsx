import { SectionCard } from "@/lib/intelligence/ui";
import type { FutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import type { FutureEvidenceCoverage } from "@/lib/intelligence/future-evidence/contracts";

type Props = {
  data: FutureReadinessPanelData;
};

function sourceLabel(source: FutureEvidenceCoverage["source"]) {
  if (source === "google_business_profile") return "Google Business Profile";
  if (source === "google_ads") return "Google Ads";
  return "Google Trends";
}

function stateClasses(state: FutureEvidenceCoverage["state"]) {
  if (state === "connected") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (state === "preserved") {
    return "border-white/10 bg-white/[0.03] text-white/60";
  }
  return "border-rose-400/20 bg-rose-400/[0.08] text-rose-100";
}

export function FutureReadinessPanel({ data }: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Future evidence readiness"
        subtitle="Preserved evidence layers for GBP, Google Ads, and Google Trends that will extend the same normalized reasoning system."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.cards.map((card) => (
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

      <SectionCard
        title="Future evidence surfaces"
        subtitle="Each source stays visible before implementation so architecture remains fixed and extensible."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {data.rows.map((row) => (
            <div
              key={row.source}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {sourceLabel(row.source)}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                    Future source
                  </div>
                </div>

                <div
                  className={`rounded-full border px-2.5 py-1 text-xs ${stateClasses(
                    row.state
                  )}`}
                >
                  {row.state}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Metrics
                  </div>
                  <div className="mt-2 text-sm text-white/72">
                    {row.metricsAvailable.join(", ")}
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Reasoning contribution
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-white/72">
                    {row.reasoningContribution.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Next unlock
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-white/72">
                    {row.nextUnlock.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}