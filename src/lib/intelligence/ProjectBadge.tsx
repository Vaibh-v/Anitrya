import type { ProjectReference } from "@/lib/evidence/types";

type ProjectBadgeProps = {
  project: ProjectReference | null;
  emptyLabel?: string;
  emptySubtext?: string;
};

export function ProjectBadge({
  project,
  emptyLabel = "No project selected",
  emptySubtext = "Select a project to load intelligence.",
}: ProjectBadgeProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
      <div className="font-medium text-white">{project?.name ?? emptyLabel}</div>
      <div className="mt-1 text-white/50">
        {project?.slug ? `Slug: ${project.slug}` : emptySubtext}
      </div>
    </div>
  );
}