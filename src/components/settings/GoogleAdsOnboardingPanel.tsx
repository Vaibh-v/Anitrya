import { SectionCard } from "@/lib/intelligence/ui";
import type { IntegrationOnboardingGroup } from "../../lib/integrations/onboarding-contracts";
import { IntegrationConnectCard } from "./IntegrationConnectCard";

type Props = {
  group: IntegrationOnboardingGroup;
};

export function GoogleAdsOnboardingPanel({ group }: Props) {
  return (
    <SectionCard title={group.title} subtitle={group.subtitle}>
      <div className="grid gap-4">
        {group.cards.map((card) => (
          <IntegrationConnectCard key={card.source} card={card} />
        ))}
      </div>
    </SectionCard>
  );
}