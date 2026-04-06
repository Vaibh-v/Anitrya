import { prisma } from "@/lib/prisma";

export type ProjectMapping = {
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  workspaceId: string;
  ga4PropertyId: string | null;
  gscSiteUrl: string | null;
};

export async function getProjectMapping(input: {
  projectRef: string;
  workspaceId?: string;
}): Promise<ProjectMapping> {
  const project = await prisma.project.findFirst({
    where: {
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      OR: [{ id: input.projectRef }, { slug: input.projectRef }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      workspaceId: true,
      ga4PropertyId: true,
      gscSiteId: true,
    },
  });

  if (!project) {
    throw new Error("Project not found for the current workspace.");
  }

  return {
    projectId: project.id,
    projectSlug: project.slug,
    projectLabel: project.name,
    workspaceId: project.workspaceId,
    ga4PropertyId: project.ga4PropertyId ?? null,
    gscSiteUrl: project.gscSiteId ?? null,
  };
}