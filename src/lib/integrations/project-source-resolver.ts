import { prisma } from "@/lib/prisma";

export type ResolvedProjectSources = {
  projectId: string;
  projectLabel: string;
  workspaceId: string;
  ga4PropertyId: string | null;
  ga4PropertyLabel: string | null;
  gscSiteUrl: string | null;
  gscSiteLabel: string | null;
};

export async function resolveProjectSources(input: {
  workspaceId: string;
  projectId: string;
}): Promise<ResolvedProjectSources> {
  const project = await prisma.project.findFirst({
    where: {
      workspaceId: input.workspaceId,
      slug: input.projectId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      ga4PropertyId: true,
      ga4Property: {
        select: {
          propertyName: true,
          displayName: true,
          accountName: true,
        },
      },
      gscSite: {
        select: {
          siteUrl: true,
        },
      },
    },
  });

  if (!project) {
    return {
      projectId: input.projectId,
      projectLabel: input.projectId,
      workspaceId: input.workspaceId,
      ga4PropertyId: null,
      ga4PropertyLabel: null,
      gscSiteUrl: null,
      gscSiteLabel: null,
    };
  }

  return {
    projectId: project.slug,
    projectLabel: project.name,
    workspaceId: input.workspaceId,
    ga4PropertyId: project.ga4PropertyId ?? null,
    ga4PropertyLabel:
      project.ga4Property?.displayName ??
      project.ga4Property?.propertyName ??
      null,
    gscSiteUrl: project.gscSite?.siteUrl ?? null,
    gscSiteLabel: project.gscSite?.siteUrl ?? null,
  };
}
