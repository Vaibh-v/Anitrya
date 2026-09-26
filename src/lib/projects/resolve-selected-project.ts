import { prisma } from "@/lib/prisma";

export type ResolvedSelectedProject = {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  ga4PropertyId: string | null;
  gscSiteId: string | null;
};

export async function resolveSelectedProject(input: {
  workspaceId: string | null;
  projectSlug: string | null;
}): Promise<ResolvedSelectedProject | null> {
  if (!input.workspaceId) return null;

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: input.workspaceId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!projects.length) return null;

  const selected = input.projectSlug
    ? projects.find((project) => project.slug === input.projectSlug)
    : projects[0];

  if (!selected) return null;

  return {
    id: selected.id,
    workspaceId: selected.workspaceId,
    slug: selected.slug,
    name: selected.name,
    ga4PropertyId: selected.ga4PropertyId,
    gscSiteId: selected.gscSiteId,
  };
}

export async function listWorkspaceProjects(workspaceId: string) {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      ga4Property: { select: { propertyName: true, displayName: true } },
      gscSite: { select: { siteUrl: true } },
    },
  });

  return projects.map((project) => {
    const propertyId = project.ga4Property?.propertyName.replace(/^properties\//, "") ?? null;
    const name = project.ga4Property?.displayName ?? null;
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      slug: project.slug,
      name: project.name,
      ga4PropertyId: project.ga4PropertyId,
      gscSiteId: project.gscSiteId,
      // Human-readable labels for the project cards (the ids above are
      // internal record ids and meant nothing to users).
      ga4Label: propertyId
        ? name && !name.includes(propertyId) ? `${name} (${propertyId})` : name ?? propertyId
        : null,
      gscLabel: project.gscSite?.siteUrl ?? null,
    };
  });
}
