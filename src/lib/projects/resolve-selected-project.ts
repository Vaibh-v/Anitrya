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

  const selected =
    projects.find((project) => project.slug === input.projectSlug) ?? projects[0];

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
  });

  return projects.map((project) => ({
    id: project.id,
    workspaceId: project.workspaceId,
    slug: project.slug,
    name: project.name,
    ga4PropertyId: project.ga4PropertyId,
    gscSiteId: project.gscSiteId,
  }));
}