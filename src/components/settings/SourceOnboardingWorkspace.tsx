import { buildFutureSourceGroups } from "@/lib/integrations/future-source-catalog";
import {
  computeFutureSourceWorkspaceStats,
  flattenFutureSourceGroups,
} from "@/lib/integrations/future-source-readiness";
import type {
  FutureSourceCard,
  FutureSourceGroup,
} from "@/lib/integrations/future-source-contracts";
import { SectionCard } from "@/lib/intelligence/ui";
import { IntegrationConnectCard } from "@/components/settings/IntegrationConnectCard";
import { SurfaceMetricCard } from "@/components/shared/SurfaceMetricCard";

type Props = {
  projectName: string;
};

function SourceMappingPanel({
  card,
  projectName,
}: {
  card: FutureSourceCard;
  projectName: string;
}) {
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
        This is the project-scoped mapping layer. Once provider wiring is completed,
        the selected source will be attached to this project and feed the same normalized
        reasoning system.
      </div>
    </div>
  );
}

export function SourceOnboardingWorkspace({ projectName }: Props) {
  const groups = buildFutureSourceGroups();
  const workspaceStats = computeFutureSourceWorkspaceStats(
    flattenFutureSourceGroups(groups)
  );

  return (
    <div className="space-y-6">
      <SectionCard
        title="Future source workspace"
        subtitle="Prepared onboarding surfaces for Google Business Profile, Google Ads, and Google Trends."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SurfaceMetricCard
            label="Connected"
            value={workspaceStats.connected}
            context="Future-source layers already contributing"
          />
          <SurfaceMetricCard
            label="Available"
            value={workspaceStats.available}
            context="Ready for provider wiring"
          />
          <SurfaceMetricCard
            label="Preserved"
            value={workspaceStats.preserved}
            context="Held in architecture for next unlock"
          />
          <SurfaceMetricCard
            label="Blocked"
            value={workspaceStats.blocked}
            context="Visible blockers not yet resolved"
          />
        </div>
      </SectionCard>

      {groups.map((group: FutureSourceGroup) => (
        <SectionCard
          key={group.id}
          title={group.title}
          subtitle={group.subtitle}
        >
          <div className="space-y-4">
            {group.cards.map((card: FutureSourceCard) => (
              <div
                key={card.id}
                className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"
              >
                <IntegrationConnectCard card={card} />
                <SourceMappingPanel card={card} projectName={projectName} />
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}