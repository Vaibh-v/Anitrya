import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildBehaviorConnectedSources,
  buildBehaviorReadinessCards,
} from "@/lib/intelligence/section-readiness";
import {
  buildIntelligenceHref,
  buildOverviewHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";
import { EvidencePageHero } from "@/components/shared/EvidencePageHero";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { EvidenceLinkedNavPanel } from "@/components/shared/EvidenceLinkedNavPanel";
import { EvidenceCoveragePanel } from "@/components/shared/EvidenceCoveragePanel";
import { SectionInterpretationPanel } from "@/components/shared/SectionInterpretationPanel";
import { SectionFindingsPanel } from "@/components/shared/SectionFindingsPanel";
import { SectionStatCards } from "@/components/shared/SectionStatCards";
import { SectionUnlockPanel } from "@/components/shared/SectionUnlockPanel";
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

export default async function BehaviorPage({ searchParams }: PageProps) {
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
      <DateRangeToolbar
        basePath="/home/behavior"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <EvidencePageHero
        eyebrow="Anitrya Intelligence"
        title="Behavior evidence"
        description="Landing-page and acquisition-quality interpretation built from normalized GA4 behavior evidence."
        projectLabel={projectLabel}
        projectId={projectId}
      />

      <ProjectMappingHealthPanel
        description="Behavior accuracy depends on the active project remaining mapped to the correct GA4 property and preserving the same project context as Intelligence."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: projectLabel ? "ready" : "missing",
            context: "Current business context selected for the behavior read.",
          },
          {
            label: "Project id",
            value: projectId || "unresolved",
            tone: projectId ? "ready" : "missing",
            context: "The project slug currently passed through the behavior layer.",
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
            context: "The current evidence window used to evaluate behavior coverage.",
          },
        ]}
      />

      <ReadinessMatrixPanel
        title="Behavior readiness"
        description="A shared view of what is structurally ready versus still blocked across the behavior layer."
        items={buildBehaviorReadinessCards()}
      />

      <SectionStatCards
        items={[
          {
            label: "Landing rows",
            value: 0,
            context: "Page-level behavior evidence available in the current range.",
          },
          {
            label: "Source rows",
            value: 0,
            context: "Acquisition-quality rows available in the current range.",
          },
          {
            label: "Entity findings",
            value: 0,
            context: "Structured behavior findings currently ranked.",
          },
          {
            label: "Confidence",
            value: "low",
            context: "Current ranked confidence for behavior interpretation.",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <EvidenceCoveragePanel
          title="Behavior evidence coverage"
          description="Coverage across landing quality and acquisition-quality interpretation."
          cards={[
            {
              label: "Landing evidence",
              value: 0,
              context:
                "Page-level engagement and conversion-signal evidence used for behavior diagnosis.",
            },
            {
              label: "Acquisition evidence",
              value: 0,
              context:
                "Source / medium evidence used for traffic-quality and conversion-support interpretation.",
            },
            {
              label: "Best next step",
              value: "quality / conversion",
              context:
                "Use landing and source concentration to isolate weak intent-to-performance alignment.",
            },
            {
              label: "Readiness",
              value: "thin",
              context:
                "Indicates whether behavior evidence is deep enough for stronger ranking.",
            },
          ]}
        />

        <SectionInterpretationPanel
          title="Behavior interpretation"
          description="Current behavior contribution to the total intelligence read."
          emptyTitle="No diagnostics available"
          emptyDescription="Evidence is still limited for this section. Run sync and review connected sources."
        />
      </div>

      <SectionFindingsPanel
        title="Behavior findings"
        description="Structured behavior findings from the current evidence set."
        emptyTitle="No findings yet"
        emptyDescription="Structured behavior findings will appear here as entity-level evidence deepens."
      />

      <ConnectedSourcesPanel
        title="Connected sources"
        description="Current status of the sources that should eventually power stronger behavior interpretation."
        items={buildBehaviorConnectedSources()}
      />

      <ProjectSyncReadinessBanner
        summary="The behavior section is ready to accept normalized GA4 landing and acquisition-quality evidence, but the current range is still empty."
        statuses={[
          { label: "Landing evidence missing", tone: "missing" },
          { label: "Source evidence missing", tone: "missing" },
          { label: "Behavior section ready", tone: "partial" },
          { label: "Execution linked", tone: "ready" },
        ]}
      />

      <SectionUnlockPanel
        title="What unlocks stronger behavior interpretation"
        description="Behavior ranking quality improves only when normalized GA4 landing and acquisition evidence becomes available together."
        unlocks={[
          "Hydrate landing rows into page-quality interpretation.",
          "Hydrate source / medium rows into acquisition-quality interpretation.",
          "Promote behavior contradiction reads only after landing and source evidence confirm the same pattern.",
        ]}
      />

      <SectionActionChecklist
        title="Behavior next actions"
        description="The fastest path to stronger behavior interpretation is correct project mapping plus fully hydrated GA4 evidence."
        actions={[
          "Confirm the active project still maps to the correct GA4 property.",
          "Run sync after mapping is confirmed so landing and source rows can hydrate.",
          "Validate that landing and acquisition evidence point to the same performance pattern before promotion.",
          "Re-check the intelligence read after GA4 behavior evidence becomes materially available.",
        ]}
      />

      <EvidenceLinkedNavPanel
        title="Evidence-linked navigation"
        description="Move from behavior into adjacent evidence layers."
        items={[
          {
            label: "Open overview drilldown",
            href: buildOverviewHref(navContext),
            description:
              "Review high-level evidence concentration across traffic, visibility, and landing quality.",
          },
          {
            label: "Open SEO drilldown",
            href: buildSeoHref(navContext),
            description:
              "Inspect query and page evidence that should align with behavioral performance.",
          },
          {
            label: "Open intelligence read",
            href: buildIntelligenceHref(navContext),
            description:
              "Review command center, hypotheses, outcomes, and execution intelligence.",
          },
        ]}
      />
    </main>
  );
}