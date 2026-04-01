import type { FutureSourceCard } from "@/lib/integrations/future-source-contracts";

type Props = {
  card: FutureSourceCard;
};

export function FutureSourceChecklist({ card }: Props) {
  return (
    <div className="mt-4 rounded-[16px] border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
        Onboarding path
      </div>

      <div className="mt-3 space-y-2">
        {card.onboardingSteps.map((step) => (
          <div
            key={step}
            className="rounded-[14px] border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-white/72"
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}