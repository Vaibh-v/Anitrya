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
        projectSlug={selectedProject.hasProject ? projectId : null}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <PageSectionShell
        eyebrow="Anitrya intelligence"
        title="SEO evidence"
        body="Search-demand and search-page interpretation built from normalized Search Console evidence."
        projectLabel={projectLabel}
        projectSubtext={selectedProject.hasProject ? `ACTIVE PROJECT • ${projectId}` : "No project selected"}
      />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-white/65">
        SEO remains ready to consume normalized GSC evidence. The next real product step is live query and page row hydration into the evidence store, not another shell rewrite.
      </section>
    </main>
  );
}