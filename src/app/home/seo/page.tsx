import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildSeoConnectedSources,
  buildSeoReadinessCards,
} from "@/lib/intelligence/section-readiness";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildOverviewHref,
} from "@/lib/intelligence/navigation-links";
import { ProjectContextSection } from "@/components/shared/ProjectContextSection";
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

export default async function SeoPage({ searchParams }: PageProps) {
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
            href: "/home/seo?project=clara-ai",
            selected: projectLabel === "Clara AI",
          },
          {
            label: "ZT",
            ga4Label: "ZenTrades",
            gscLabel: "sc-domain:zentrades.pro",
            href: "/home/seo?project=zt",
            selected: projectId === "zt",
          },
        ]}
      />

      <DateRangeToolbar
        basePath="/home/seo"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <EvidencePageHero
        eyebrow="Anitrya Intelligence"
        title="SEO evidence"
        description="Search-demand and search-page interpretation built from normalized Search Console evidence."
        projectLabel={projectLabel}
        projectId={projectId}
      />

      <ProjectMappingHealthPanel
        description="SEO accuracy depends on the active project remaining mapped to the correct GSC site and preserving the same project context as Intelligence."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: projectLabel ? "ready" : "missing",
            context: "Current business context selected for the SEO read.",
          },
          {
            label: "Project id",
            value: projectId || "unresolved",
            tone: projectId ? "ready" : "missing",
            context: "The project slug currently passed through the SEO layer.",
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
            context: "The current evidence window used to evaluate search coverage.",
          },
        ]}
      />

      <ReadinessMatrixPanel
        title="SEO readiness"
        description="A shared view of what is structurally ready versus still blocked across the SEO layer."
        items={buildSeoReadinessCards()}
      />

      <SectionStatCards
        items={[
          {
            label: "Query rows",
            value: 0,
            context: "Available query-level evidence for the current range.",
          },
          {
            label: "Page rows",
            value: 0,
            context: "Available page-level evidence for the current range.",
          },
          {
            label: "Entity findings",
            value: 0,
            context: "Structured SEO findings currently ranked.",
          },
          {
            label: "Confidence",
            value: "low",
            context: "Current ranked confidence for SEO interpretation.",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <EvidenceCoveragePanel
          title="SEO evidence coverage"
          description="Coverage across demand capture and page-level search visibility."
          cards={[
            {
              label: "Query evidence",
              value: 0,
              context:
                "Search demand capture evidence used for topic, CTR, and impression interpretation.",
            },
            {
              label: "Page evidence",
              value: 0,
              context:
                "Page-level visibility evidence used for ranking and page-priority interpretation.",
            },
            {
              label: "Best next step",
              value: "CTR / rank focus",
              context:
                "Use query and page concentration to find stronger confirming patterns.",
            },
            {
              label: "Readiness",
              value: "thin",
              context:
                "Indicates whether SEO evidence is deep enough for stronger ranking.",
            },
          ]}
        />

        <SectionInterpretationPanel
          title="SEO interpretation"
          description="Current SEO contribution to the total intelligence read."
          emptyTitle="No diagnostics available"
          emptyDescription="Evidence is still limited for this section. Run sync and review connected sources."
        />
      </div>

      <SectionFindingsPanel
        title="SEO findings"
        description="Structured search findings from the current evidence set."
        emptyTitle="No findings yet"
        emptyDescription="Structured search findings will appear here as entity-level evidence deepens."
      />

      <ConnectedSourcesPanel
        title="Connected sources"
        description="Current status of the sources that should eventually power stronger SEO interpretation."
        items={buildSeoConnectedSources()}
      />

      <ProjectSyncReadinessBanner
        summary="The SEO section is ready to accept normalized Search Console evidence, but query and page rows are still missing in the current read."
        statuses={[
          { label: "Query evidence missing", tone: "missing" },
          { label: "Page evidence missing", tone: "missing" },
          { label: "SEO section ready", tone: "partial" },
          { label: "Intelligence linked", tone: "ready" },
        ]}
      />

      <SectionUnlockPanel
        title="What unlocks stronger SEO interpretation"
        description="SEO ranking quality improves only when normalized Search Console evidence is materially available."
        unlocks={[
          "Hydrate normalized query rows into search-demand interpretation.",
          "Hydrate normalized page rows into page-priority interpretation.",
          "Promote SEO contradiction reads only after query and page evidence confirm the same pattern.",
        ]}
      />

      <SectionActionChecklist
        title="SEO next actions"
        description="The fastest path to stronger SEO interpretation is correct project mapping plus fully hydrated GSC evidence."
        actions={[
          "Confirm the active project still maps to the correct Search Console property.",
          "Run sync after mapping is confirmed so query and page rows can hydrate.",
          "Validate that query and page evidence point to the same ranking pattern before promotion.",
          "Re-check the intelligence read after GSC evidence becomes materially available.",
        ]}
      />

      <EvidenceLinkedNavPanel
        title="Evidence-linked navigation"
        description="Move from SEO into adjacent evidence layers."
        items={[
          {
            label: "Open overview drilldown",
            href: buildOverviewHref(navContext),
            description:
              "Review the project-wide concentration of search, landing, and acquisition evidence.",
          },
          {
            label: "Open behavior drilldown",
            href: buildBehaviorHref(navContext),
            description:
              "Inspect landing and acquisition-quality evidence that should align with search intent.",
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