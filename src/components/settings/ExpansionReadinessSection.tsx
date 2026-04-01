import type { FutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import { SectionCard } from "@/lib/intelligence/ui";
import { SourceOnboardingWorkspace } from "@/components/settings/SourceOnboardingWorkspace";

type Props = {
  futureReadiness: FutureReadinessPanelData;
  projectName: string;
};

export function ExpansionReadinessSection({
  futureReadiness,
  projectName,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Expansion readiness"
        subtitle="Prepared connector surfaces for Google Business Profile, Google Ads, Google Trends, and future market-context layers."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {futureReadiness.cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm leading-6 text-white/52">
                {card.context}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SourceOnboardingWorkspace projectName={projectName} />
    </div>
  );
}