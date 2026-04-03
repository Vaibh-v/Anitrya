import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildOverviewHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";
import {
  buildIntelligenceConnectedSources,
  buildIntelligenceReadinessCards,
} from "@/lib/intelligence/section-readiness";
import { ProjectContextSection } from "@/components/shared/ProjectContextSection";
import { CommandCenterPanel } from "@/components/intelligence/CommandCenterPanel";
import { HypothesisLearningSummaryPanel } from "@/components/intelligence/HypothesisLearningSummaryPanel";
import { HypothesisPanel } from "@/components/intelligence/HypothesisPanel";
import { OutcomeInsightsPanel } from "@/components/intelligence/OutcomeInsightsPanel";
import { ActivityFeedPanel } from "@/components/intelligence/ActivityFeedPanel";
import { ExecutionQueuePanel } from "@/components/intelligence/ExecutionQueuePanel";
import { IntelligenceSummarySection } from "@/components/intelligence/IntelligenceSummarySection";
import { IntelligenceCompletionPanel } from "@/components/intelligence/IntelligenceCompletionPanel";
import { EvidencePageHero } from "@/components/shared/EvidencePageHero";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { EvidenceLinkedNavPanel } from "@/components/shared/EvidenceLinkedNavPanel";
import { ReadinessMatrixPanel } from "@/components/shared/ReadinessMatrixPanel";
import { ConnectedSourcesPanel } from "@/components/shared/ConnectedSourcesPanel";
import { SectionActionChecklist } from "@/components/shared/SectionActionChecklist";

type PageProps = {
  searchParams?: Promise<{
    project?: string;
    workspace?: string;
    preset?: string;
    from?: string;
    to?: string;
    projectName?: string;
  }>;
};

export default async function IntelligencePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireSession();

  const selectedProject = resolveSelectedProject({
    requestedProjectId: params.project ?? null,
    requestedProjectName: params.projectName ?? null,
    sessionWorkspaceId: session.user?.workspaceId ?? params.workspace ?? null,
    fallbackProjectId: "default-project",
  });

  const dateRange = resolveDateRange({
    preset: params.preset,
    from: params.from,
    to: params.to,
  });

  const projectId = selectedProject.projectId;
  const projectLabel = selectedProject.displayName;
  const workspaceId = session.user?.workspaceId ?? params.workspace ?? null;

  const navContext = {
    projectId,
    workspaceId,
    preset: params.preset,
    from: params.from,
    to: params.to,
  };

  return (
    <main className="space-y-8">
      <ProjectContextSection
        activeProjectLabel={projectLabel}
        activeProjectId={selectedProject.hasProject ? projectId : null}
        cards={[
          {
            label: "Clara AI",
            ga4Label: "Clara Ai",
            gscLabel: "sc-domain:justclara.ai",
            href: "/home/intelligence?project=clara-ai",
            selected: projectLabel === "Clara AI",
          },
          {
            label: "ZT",
            ga4Label: "ZenTrades",
            gscLabel: "sc-domain:zentrades.pro",
            href: "/home/intelligence?project=zt",
            selected: projectId === "zt",
          },
        ]}
      />

      <DateRangeToolbar
        basePath="/home/intelligence"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <EvidencePageHero
        eyebrow="Anitrya Intelligence"
        title="Intelligence read"
        description="Cross-source reasoning built from normalized project evidence, structured diagnostics, missing-data awareness, persistent memory, tracked execution, learning from real outcomes, and recent project activity."
        projectLabel={projectLabel}
        projectId={projectId}
      />

      <ProjectMappingHealthPanel
        description="Intelligence accuracy depends on Overview, SEO, and Behavior all preserving the same project and date context while learning remains attached to the same execution history."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: projectLabel ? "ready" : "missing",
            context: "Current business context selected for the intelligence read.",
          },
          {
            label: "Project id",
            value: projectId || "unresolved",
            tone: projectId ? "ready" : "missing",
            context: "The project slug currently passed through the intelligence layer.",
          },
          {
            label: "Workspace",
            value: workspaceId || "missing",
            tone: workspaceId ? "ready" : "missing",
            context: "Workspace identity used to preserve project context across all tabs.",
          },
          {
            label: "Date range",
            value: `${dateRange.from} → ${dateRange.to}`,
            tone: "ready",
            context: "The current evidence window used to evaluate project-wide intelligence.",
          },
        ]}
      />

      <ReadinessMatrixPanel
        title="Intelligence readiness"
        description="A shared view of what is structurally ready versus still blocked across the intelligence layer."
        items={buildIntelligenceReadinessCards()}
      />

      <ProjectSyncReadinessBanner
        summary="The intelligence surface is fully structured, but evidence depth is still constrained by missing normalized GA4, GSC, and behavior rows."
        statuses={[
          { label: "GA4 missing", tone: "missing" },
          { label: "GSC missing", tone: "missing" },
          { label: "Behavior partial", tone: "partial" },
          { label: "Learning active", tone: "ready" },
        ]}
      />

      <CommandCenterPanel projectId={projectId} />
      <HypothesisLearningSummaryPanel projectId={projectId} />
      <HypothesisPanel projectId={projectId} />
      <OutcomeInsightsPanel projectId={projectId} />
      <ActivityFeedPanel projectId={projectId} />

      <ConnectedSourcesPanel
        title="Connected sources"
        description="Current status of the source and system layers that should eventually power stronger intelligence ranking."
        items={buildIntelligenceConnectedSources()}
      />

      <ExecutionQueuePanel projectId={projectId} />
      <IntelligenceSummarySection projectId={projectId} />
      <IntelligenceCompletionPanel />

      <SectionActionChecklist
        title="Intelligence next actions"
        description="The fastest path to stronger intelligence is deeper normalized evidence plus more reliable execution learning."
        actions={[
          "Hydrate normalized GA4 and GSC evidence so ranked hypotheses can rely on real cross-source support.",
          "Keep recording outcomes after execution so learning quality compounds over time.",
          "Use Overview, SEO, and Behavior pages to verify that evidence depth actually improves after sync.",
          "Promote stronger contradiction reads only after evidence and learning both become materially available.",
        ]}
      />

      <EvidenceLinkedNavPanel
        title="Evidence-linked navigation"
        description="Move from intelligence into the supporting evidence layers while preserving the active project and date context."
        items={[
          {
            label: "Open overview drilldown",
            href: buildOverviewHref(navContext),
            description:
              "Review project-level coverage across traffic, visibility, landing quality, and future context.",
          },
          {
            label: "Open SEO drilldown",
            href: buildSeoHref(navContext),
            description:
              "Inspect query and page evidence used for search-demand and ranking interpretation.",
          },
          {
            label: "Open behavior drilldown",
            href: buildBehaviorHref(navContext),
            description:
              "Inspect landing and acquisition-quality evidence used for behavior interpretation.",
          },
          {
            label: "Refresh intelligence read",
            href: buildIntelligenceHref(navContext),
            description:
              "Re-open the intelligence layer with the active project and current date window preserved.",
          },
        ]}
      />
    </main>
  );
}