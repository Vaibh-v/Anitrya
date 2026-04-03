import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";
import {
  buildOverviewConnectedSources,
  buildOverviewReadinessCards,
} from "@/lib/intelligence/section-readiness";
import { ProjectContextSection } from "@/components/shared/ProjectContextSection";
import { EvidencePageHero } from "@/components/shared/EvidencePageHero";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { EvidenceLinkedNavPanel } from "@/components/shared/EvidenceLinkedNavPanel";
import { EvidenceCoveragePanel } from "@/components/shared/EvidenceCoveragePanel";
import { SectionInterpretationPanel } from "@/components/shared/SectionInterpretationPanel";
import { SectionStatCards } from "@/components/shared/SectionStatCards";
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

export default async function OverviewPage({ searchParams }: PageProps) {
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
            href: "/home/overview?project=clara-ai",
            selected: projectLabel === "Clara AI",
          },
          {
            label: "ZT",
            ga4Label: "ZenTrades",
            gscLabel: "sc-domain:zentrades.pro",
            href: "/home/overview?project=zt",
            selected: projectId === "zt",
          },
        ]}
      />

      <DateRangeToolbar
        basePath="/home/overview"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <EvidencePageHero
        eyebrow="Anitrya Intelligence"
        title="Project overview"
        description="Evidence-backed overview across traffic, search visibility, behavior quality, and future expansion readiness."
        projectLabel={projectLabel}
        projectId={projectId}
      />

      <ProjectMappingHealthPanel
        description="Overview accuracy depends on the active project remaining mapped to one GA4 property and one GSC site."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: projectLabel ? "ready" : "missing",
            context: "Current business context selected for the overview read.",
          },
          {
            label: "Project id",
            value: projectId || "unresolved",
            tone: projectId ? "ready" : "missing",
            context: "The project slug currently passed through the overview layer.",
          },
          {
            label: "Workspace",
            value: workspaceId || "missing",
            tone: workspaceId ? "ready" : "missing",
            context: "Workspace identity used to preserve project context across tabs.",
          },
          {
            label: "Date range",
            value: `${dateRange.from} → ${dateRange.to}`,
            tone: "ready",
            context: "The current evidence window used to evaluate project coverage.",
          },
        ]}
      />

      <ReadinessMatrixPanel
        title="Overview readiness"
        description="A shared view of what is structurally ready versus still blocked across the overview layer."
        items={buildOverviewReadinessCards()}
      />

      <SectionStatCards
        items={[
          {
            label: "GA4 source rows",
            value: 0,
            context: "Traffic-source evidence available in the current range.",
          },
          {
            label: "GA4 landing rows",
            value: 0,
            context: "Landing-page quality evidence currently available.",
          },
          {
            label: "GSC query rows",
            value: 0,
            context: "Search-demand rows captured for the selected range.",
          },
          {
            label: "GSC page rows",
            value: 0,
            context: "Search page-evidence rows available for diagnostics.",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <EvidenceCoveragePanel
          title="Overview evidence concentration"
          description="High-level evidence coverage across the currently connected sources."
          cards={[
            {
              label: "Search demand",
              value: 0,
              context:
                "Query-level GSC evidence available for ranked search interpretation.",
            },
            {
              label: "Search pages",
              value: 0,
              context:
                "Page-level GSC evidence available for visibility and landing alignment review.",
            },
            {
              label: "Landing quality",
              value: 0,
              context:
                "GA4 landing rows available for page-level quality interpretation.",
            },
            {
              label: "Acquisition mix",
              value: 0,
              context:
                "GA4 source / medium rows available for traffic-quality interpretation.",
            },
          ]}
        />

        <SectionInterpretationPanel
          title="Overview interpretation"
          description="Evidence-backed read of the current project condition."
          emptyTitle="No diagnostics available"
          emptyDescription="Evidence is still limited for this section. Run sync and review connected sources."
        />
      </div>

      <ConnectedSourcesPanel
        title="Connected sources"
        description="Current status of the sources that should eventually power stronger overview interpretation."
        items={buildOverviewConnectedSources()}
      />

      <ProjectSyncReadinessBanner
        summary="The overview layer is structured correctly, but stronger diagnostic coverage depends on normalized GA4 and GSC evidence becoming available."
        statuses={[
          { label: "GA4 missing", tone: "missing" },
          { label: "GSC missing", tone: "missing" },
          { label: "Overview ready", tone: "partial" },
          { label: "Future sources preserved", tone: "ready" },
        ]}
      />

      <SectionStatCards
        items={[
          {
            label: "Future evidence layers",
            value: 3,
            context: "Preserved sources ready for implementation.",
          },
          {
            label: "Connected now",
            value: 0,
            context: "Future-source layers already contributing.",
          },
          {
            label: "Preserved next",
            value: 3,
            context: "Sources held in architecture and ready to unlock.",
          },
          {
            label: "Known blockers",
            value: 6,
            context: "Visible blockers that still need implementation work.",
          },
        ]}
      />

      <SectionActionChecklist
        title="Overview next actions"
        description="The fastest path to a stronger overview read is tighter project mapping plus deeper normalized evidence."
        actions={[
          "Confirm the active project still maps to the correct GA4 property.",
          "Confirm the active project still maps to the correct GSC site.",
          "Run sync after mapping is confirmed so overview rows can hydrate cleanly.",
          "Re-check overview interpretation only after search and traffic evidence are materially available.",
        ]}
      />

      <EvidenceLinkedNavPanel
        title="Evidence-linked navigation"
        description="Move from overview into deeper evidence layers."
        items={[
          {
            label: "Open SEO drilldown",
            href: buildSeoHref(navContext),
            description:
              "Inspect query and page evidence used for ranked search interpretation.",
          },
          {
            label: "Open behavior drilldown",
            href: buildBehaviorHref(navContext),
            description:
              "Inspect landing and acquisition-quality evidence used for behavioral reads.",
          },
          {
            label: "Open intelligence read",
            href: buildIntelligenceHref(navContext),
            description:
              "Review command center, hypotheses, outcomes, and execution memory.",
          },
        ]}
      />
    </main>
  );
}