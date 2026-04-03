import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { ProjectContextSection } from "@/components/shared/ProjectContextSection";
import { PageSectionShell } from "@/components/shared/PageSectionShell";

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

  const projectLabel = selectedProject.displayName;
  const projectId = selectedProject.projectId;
  const workspaceId = session.user?.workspaceId ?? params.workspace ?? null;

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
            href: "/home/behavior?project=clara-ai",
            selected: projectLabel === "Clara AI",
          },
          {
            label: "ZT",
            ga4Label: "ZenTrades",
            gscLabel: "sc-domain:zentrades.pro",
            href: "/home/behavior?project=zt",
            selected: projectId === "zt",
          },
        ]}
      />

      <DateRangeToolbar
        basePath="/home/behavior"
        projectSlug={selectedProject.hasProject ? projectId : null}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <PageSectionShell
        eyebrow="Anitrya intelligence"
        title="Behavior evidence"
        body="Landing-page and acquisition-quality interpretation built from normalized GA4 behavior evidence."
        projectLabel={projectLabel}
        projectSubtext={selectedProject.hasProject ? `ACTIVE PROJECT • ${projectId}` : "No project selected"}
      />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-white/65">
        Behavior is structurally ready but still waiting on persisted landing and source evidence from the ingestion layer.
      </section>
    </main>
  );
}