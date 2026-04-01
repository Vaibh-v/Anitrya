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
      behavior: {
        title: "Behavior",
        summary:
          "Behavior evidence is present but still too thin to support a stronger ranked on-site hypothesis.",
        confidence: "low",
        actions: [
          "Review landing-page and source / medium rows for stronger quality or conversion gaps.",
          "Deepen behavior evidence so stronger confirming signals can be ranked.",
        ],
      },
    }
  );
}

function safeBehaviorFindings(intelligence: any) {
  const findings = Array.isArray(intelligence?.behaviorFindings)
    ? intelligence.behaviorFindings
    : [];

  return findings.map((finding: any, index: number) => ({
    title: String(finding?.title ?? `Behavior finding ${index + 1}`),
    body: String(finding?.body ?? finding?.summary ?? ""),
    confidence: String(finding?.confidence ?? "low"),
  }));
}

export default async function BehaviorPage({ searchParams }: PageProps) {
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
  const landingRows = Array.isArray(evidence?.ga4Landings)
    ? evidence.ga4Landings.length
    : 0;
  const sourceRows = Array.isArray(evidence?.ga4SourceRows)
    ? evidence.ga4SourceRows.length
    : 0;
  const findings = safeBehaviorFindings(intelligence);

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home/behavior"
        projectSlug={selectedProject?.slug ?? params.project ?? null}
        workspaceId={selectedProject?.workspaceId ?? params.workspace ?? null}
        range={dateRange}
      />

      <PageHero
        eyebrow="Anitrya intelligence"
        title="Behavior evidence"
        body="Landing-page and acquisition-quality interpretation built from normalized GA4 behavior evidence."
        projectLabel={project?.name ?? "No project selected"}
        projectSubtext={
          project?.slug
            ? `Slug: ${project.slug}`
            : "Select a project to load behavior evidence."
        }
      />

      <KpiStrip
        items={[
          {
            label: "Landing rows",
            value: landingRows,
            context: "Page-level behavior evidence available in the current range",
          },
          {
            label: "Source rows",
            value: sourceRows,
            context: "Acquisition-quality rows available in the current range",
          },
          {
            label: "Entity findings",
            value: findings.length,
            context: "Structured behavior findings currently ranked",
          },
          {
            label: "Confidence",
            value: diagnostics.behavior.confidence,
            context: "Current ranked confidence for behavior interpretation",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <EvidenceCountGrid
          title="Behavior evidence coverage"
          subtitle="Coverage across landing quality and acquisition-quality interpretation."
          cards={[
            {
              label: "Landing evidence",
              value: landingRows,
              body: "Page-level engagement and conversion-signal evidence used for behavior diagnosis.",
            },
            {
              label: "Acquisition evidence",
              value: sourceRows,
              body: "Source / medium evidence used for traffic-quality and conversion-support interpretation.",
            },
            {
              label: "Best next step",
              value: "quality / conversion",
              body: "Use landing and source concentration to isolate weak intent-to-performance alignment.",
            },
            {
              label: "Readiness",
              value: landingRows + sourceRows > 0 ? "present" : "thin",
              body: "Indicates whether behavior evidence is deep enough for stronger ranking.",
            },
          ]}
        />

        <DiagnosticsPanel
          title="Behavior interpretation"
          subtitle="Current behavior contribution to the total intelligence read."
          diagnostic={diagnostics.behavior}
        />
      </div>

      <InsightStack
        title="Behavior findings"
        subtitle="Structured behavior findings from the current evidence set."
        items={findings}
      />
    </main>
  );
}