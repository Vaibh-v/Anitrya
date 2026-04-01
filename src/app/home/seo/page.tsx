import { getProjectIntelligenceForRange } from "@/lib/intelligence";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import {
  DateRangeToolbar,
  DiagnosticsPanel,
} from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { PageHero } from "@/components/shared/PageHero";
import { KpiStrip } from "@/components/shared/KpiStrip";
import { EvidenceCountGrid } from "@/components/shared/EvidenceCountGrid";
import { InsightStack } from "@/components/shared/InsightStack";

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
      seo: {
        title: "SEO",
        summary:
          "Search evidence is present but the current rule set does not yet rank a stronger SEO hypothesis.",
        confidence: "low",
        actions: [
          "Inspect query-level and page-level evidence for stronger CTR or position gaps.",
          "Prioritize the most visible pages where search demand is already established.",
        ],
      },
    }
  );
}

function safeSeoFindings(intelligence: any) {
  const findings = Array.isArray(intelligence?.seoFindings)
    ? intelligence.seoFindings
    : [];

  return findings.map((finding: any, index: number) => ({
    title: String(finding?.title ?? `SEO finding ${index + 1}`),
    body: String(finding?.body ?? finding?.summary ?? ""),
    confidence: String(finding?.confidence ?? "low"),
  }));
}

export default async function SeoPage({ searchParams }: PageProps) {
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
  const queryRows = Array.isArray(evidence?.gscQueryRows)
    ? evidence.gscQueryRows.length
    : 0;
  const pageRows = Array.isArray(evidence?.gscPageRows)
    ? evidence.gscPageRows.length
    : 0;
  const findings = safeSeoFindings(intelligence);

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home/seo"
        projectSlug={selectedProject?.slug ?? params.project ?? null}
        workspaceId={selectedProject?.workspaceId ?? params.workspace ?? null}
        range={dateRange}
      />

      <PageHero
        eyebrow="Anitrya intelligence"
        title="SEO evidence"
        body="Search-demand and search-page interpretation built from normalized Search Console evidence."
        projectLabel={project?.name ?? "No project selected"}
        projectSubtext={
          project?.slug
            ? `Slug: ${project.slug}`
            : "Select a project to load SEO evidence."
        }
      />

      <KpiStrip
        items={[
          {
            label: "Query rows",
            value: queryRows,
            context: "Available query-level evidence for the current range",
          },
          {
            label: "Page rows",
            value: pageRows,
            context: "Available page-level evidence for the current range",
          },
          {
            label: "Entity findings",
            value: findings.length,
            context: "Structured SEO findings currently ranked",
          },
          {
            label: "Confidence",
            value: diagnostics.seo.confidence,
            context: "Current ranked confidence for SEO interpretation",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <EvidenceCountGrid
          title="SEO evidence coverage"
          subtitle="Coverage across demand capture and page-level search visibility."
          cards={[
            {
              label: "Query evidence",
              value: queryRows,
              body: "Search demand capture evidence used for topic, CTR, and impression interpretation.",
            },
            {
              label: "Page evidence",
              value: pageRows,
              body: "Page-level visibility evidence used for ranking and page-priority interpretation.",
            },
            {
              label: "Best next step",
              value: "CTR / rank focus",
              body: "Use query and page concentration to find stronger confirming patterns.",
            },
            {
              label: "Readiness",
              value: queryRows + pageRows > 0 ? "present" : "thin",
              body: "Indicates whether SEO evidence is deep enough for stronger ranking.",
            },
          ]}
        />

        <DiagnosticsPanel
          title="SEO interpretation"
          subtitle="Current SEO contribution to the total intelligence read."
          diagnostic={diagnostics.seo}
        />
      </div>

      <InsightStack
        title="SEO findings"
        subtitle="Structured search findings from the current evidence set."
        items={findings}
      />
    </main>
  );
}