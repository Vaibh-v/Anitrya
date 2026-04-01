import type { FutureSourceCard } from "@/lib/integrations/future-source-contracts";
import { FutureSourceActionButton } from "@/components/settings/FutureSourceActionButton";
import { FutureSourceChecklist } from "@/components/settings/FutureSourceChecklist";

type Props = {
  card: FutureSourceCard;
};

function stateClasses(state: FutureSourceCard["state"]) {
  if (state === "connected") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }

  if (state === "available") {
    return "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100";
  }

  if (state === "blocked") {
    return "border-rose-400/20 bg-rose-400/[0.08] text-rose-100";
  }

  return "border-white/10 bg-white/[0.03] text-white/65";
}

function categoryLabel(category: FutureSourceCard["category"]) {
  if (category === "local") return "Local";
  if (category === "paid") return "Paid";
  return "Market";
}

export function IntegrationConnectCard({ card }: Props) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{card.title}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/38">
            {categoryLabel(card.category)}
          </div>
        </div>

        <div
          className={`rounded-full border px-2.5 py-1 text-xs ${stateClasses(card.state)}`}
        >
          {card.state}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/60">{card.summary}</p>

      <div className="mt-4 rounded-[16px] border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          Reasoning role
        </div>
        <div className="mt-2 text-sm leading-6 text-white/68">
          {card.reasoningRole}
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-white/10 bg-black/16 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          Metrics unlocked
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {card.metrics.map((metric) => (
            <span
              key={metric}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/72"
            >
              {metric}
            </span>
          ))}
        </div>
      </div>

      <FutureSourceChecklist card={card} />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex-1 rounded-[16px] border border-amber-400/15 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/88">
          {card.availabilityNote}
        </div>
        <FutureSourceActionButton card={card} />
      </div>
    </div>
  );
}