import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar, ProjectBadge } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { CommandCenterPanel } from "@/components/intelligence/CommandCenterPanel";
import { HypothesisPanel } from "@/components/intelligence/HypothesisPanel";
import { OutcomeInsightsPanel } from "@/components/intelligence/OutcomeInsightsPanel";
import { ExecutionQueuePanel } from "@/components/intelligence/ExecutionQueuePanel";
import { IntelligenceSummarySection } from "@/components/intelligence/IntelligenceSummarySection";

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

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home/intelligence"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
              Anitrya Intelligence
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Intelligence read
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
              Cross-source reasoning built from normalized project evidence,
              structured diagnostics, missing-data awareness, persistent memory,
              tracked execution, and learning from real outcomes.
            </p>
          </div>

          <ProjectBadge
            label={projectLabel}
            sublabel={`ACTIVE PROJECT • ${projectId}`}
          />
        </div>
      </section>

      <CommandCenterPanel projectId={projectId} />
      <HypothesisPanel projectId={projectId} />
      <OutcomeInsightsPanel projectId={projectId} />
      <ExecutionQueuePanel projectId={projectId} />
      <IntelligenceSummarySection projectId={projectId} />
    </main>
  );
}