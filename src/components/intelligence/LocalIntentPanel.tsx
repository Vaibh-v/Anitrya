import { SectionCard } from "@/lib/intelligence/ui";
import type { MarketContextSection } from "@/lib/intelligence/market-context";

type Props = {
  section: MarketContextSection;
};

function badgeClasses(confidence: "low" | "medium" | "high") {
  if (confidence === "high") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (confidence === "medium") {
    return "border-amber-400/20 bg-amber-400/[0.08] text-amber-100";
  }
  return "border-white/10 bg-white/[0.03] text-white/65";
}

export function LocalIntentPanel({ section }: Props) {
  return (
    <SectionCard title={section.title} subtitle={section.subtitle}>
      {section.cards.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-white">
            {section.emptyTitle}
          </div>
          <p className="mt-2 text-sm leading-6 text-white/52">
            {section.emptyBody}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {section.cards.map((card) => (
            <div
              key={card.key}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm font-semibold text-white">
                  {card.title}
                </div>
                <div
                  className={`rounded-full border px-2.5 py-1 text-xs ${badgeClasses(
                    card.confidence
                  )}`}
                >
                  {card.confidence}
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/60">{card.body}</p>

              <div className="mt-4 space-y-2">
                {card.actions.map((action) => (
                  <div
                    key={action}
                    className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3 text-sm text-white/70"
                  >
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}