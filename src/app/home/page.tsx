import { getProjectIntelligenceForRange } from "@/lib/intelligence";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { buildFutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import {
  DateRangeToolbar,
  DiagnosticsPanel,
} from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { PageHero } from "@/components/shared/PageHero";
import { KpiStrip } from "@/components/shared/KpiStrip";
import { EvidenceCountGrid } from "@/components/shared/EvidenceCountGrid";
import { SectionLinkRow } from "@/components/shared/SectionLinkRow";
import { ReadinessBanner } from "@/components/shared/ReadinessBanner";

type PageProps = {
  searchParams?: Promise<{
    project?: string;
    workspace?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>;
};

function safeDiagnostics(intelligence: any) {
  return (
    intelligence?.diagnostics ?? {
      overview: {
        title: "Overview",
        summary:
          "Evidence-backed diagnostic summary is not yet available for this project and date range.",
        confidence: "low",
        actions: [
          "Run entity sync to populate evidence rows.",
          "Deepen synced range so stronger project signals can be ranked.",
        ],
      },
    }
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const selectedProject = await resolveSelectedProject({
    workspaceId: params.workspace ?? null,
    projectSlug: params.project ?? null,
  });

  const dateRange = resolveDateRange({
    preset: params.preset,
    from: params.from,
    to: params.to,
  });

  const intelligence = (await getProjectIntelligenceForRange({
    workspaceId: selectedProject?.workspaceId ?? params.workspace ?? null,
    projectSlug: selectedProject?.slug ?? params.project ?? null,
    preset: params.preset,
    from: params.from,
    to: params.to,
  })) as any;

  const project = intelligence?.project ?? selectedProject ?? null;
  const diagnostics = safeDiagnostics(intelligence);
  const evidence = intelligence?.evidence ?? {};
  const futureReadiness = buildFutureReadinessPanelData();

  const queryRows = Array.isArray(evidence?.gscQueryRows)
    ? evidence.gscQueryRows.length
    : 0;
  const pageRows = Array.isArray(evidence?.gscPageRows)
    ? evidence.gscPageRows.length
    : 0;
  const landingRows = Array.isArray(evidence?.ga4Landings)
    ? evidence.ga4Landings.length
    : 0;
  const sourceRows = Array.isArray(evidence?.ga4SourceRows)
    ? evidence.ga4SourceRows.length
    : 0;

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home"
        projectSlug={selectedProject?.slug ?? params.project ?? null}
        workspaceId={selectedProject?.workspaceId ?? params.workspace ?? null}
        range={dateRange}
      />

      <PageHero
        eyebrow="Anitrya intelligence"
        title="Project overview"
        body="Evidence-backed overview across traffic, search visibility, behavior quality, and future expansion readiness."
        projectLabel={project?.name ?? "No project selected"}
        projectSubtext={
          project?.slug
            ? `Slug: ${project.slug}`
            : "Select a project to load project-scoped evidence."
        }
      />

      <KpiStrip
        items={[
          {
            label: "GA4 source rows",
            value: sourceRows,
            context: "Traffic-source evidence available in the current range",
          },
          {
            label: "GA4 landing rows",
            value: landingRows,
            context: "Landing-page quality evidence currently available",
          },
          {
            label: "GSC query rows",
            value: queryRows,
            context: "Search-demand rows captured for the selected range",
          },
          {
            label: "GSC page rows",
            value: pageRows,
            context: "Search page-evidence rows available for diagnostics",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <EvidenceCountGrid
          title="Overview evidence concentration"
          subtitle="High-level evidence coverage across the currently connected sources."
          cards={[
            {
              label: "Search demand",
              value: queryRows,
              body: "Query-level GSC evidence available for ranked search interpretation.",
            },
            {
              label: "Search pages",
              value: pageRows,
              body: "Page-level GSC evidence available for visibility and landing alignment review.",
            },
            {
              label: "Landing quality",
              value: landingRows,
              body: "GA4 landing rows available for page-level quality interpretation.",
            },
            {
              label: "Acquisition mix",
              value: sourceRows,
              body: "GA4 source / medium rows available for traffic-quality interpretation.",
            },
          ]}
        />

        <DiagnosticsPanel
          title="Overview interpretation"
          subtitle="Evidence-backed read of the current project condition."
          diagnostic={diagnostics.overview}
        />
      </div>

      <ReadinessBanner
        title="Future market context"
        subtitle="Preserved intelligence layers for Google Business Profile, Google Ads, Google Trends, and competitor context."
        cards={futureReadiness.cards}
      />

      <SectionLinkRow
        title="Evidence-linked navigation"
        subtitle="Move from overview into deeper evidence layers."
        links={[
          {
            label: "Open SEO drilldown",
            href: `/home/seo?project=${selectedProject?.slug ?? ""}`,
          },
          {
            label: "Open behavior drilldown",
            href: `/home/behavior?project=${selectedProject?.slug ?? ""}`,
          },
          {
            label: "Open intelligence read",
            href: `/home/intelligence?project=${selectedProject?.slug ?? ""}`,
          },
        ]}
      />
    </main>
  );
}