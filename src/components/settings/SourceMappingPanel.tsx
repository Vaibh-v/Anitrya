import type { IntegrationOnboardingCard } from "../../lib/integrations/onboarding-contracts";

type Props = {
  card: IntegrationOnboardingCard;
  projectName: string;
};

export function SourceMappingPanel({ card, projectName }: Props) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/16 p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
        {card.mappingLabel}
      </div>

      <div className="mt-3 rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="text-sm font-semibold text-white">{projectName}</div>
        <div className="mt-1 text-sm text-white/55">{card.mappingPlaceholder}</div>
      </div>

      <div className="mt-3 text-sm leading-6 text-white/55">
        This is the project-scoped mapping layer. Once connected, the selected source
        will be attached to this project and feed the same normalized reasoning system.
      </div>
    </div>
  );
}