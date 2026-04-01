import { prisma } from "@/lib/prisma";

export function slugifyProjectName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getWorkspaceProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId },
    include: {
      ga4Property: true,
      gscSite: true
    },
    orderBy: { name: "asc" }
  });
}

export async function getProjectBySlug(workspaceId: string, slug?: string | null) {
  const projects = await getWorkspaceProjects(workspaceId);

  if (projects.length === 0) {
    return {
      selectedProject: null,
      projects
    };
  }

  const selectedProject =
    projects.find((project: (typeof projects)[number]) => project.slug === slug) ??
    projects[0];

  return {
    selectedProject,
    projects
  };
}

export async function createWorkspaceProject(input: {
  workspaceId: string;
  name: string;
  ga4PropertyId?: string | null;
  gscSiteId?: string | null;
}) {
  const baseSlug = slugifyProjectName(input.name);
  let slug = baseSlug || "project";
  let suffix = 1;

  while (
    await prisma.project.findFirst({
      where: {
        workspaceId: input.workspaceId,
        slug
      }
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return prisma.project.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug,
      ga4PropertyId: input.ga4PropertyId ?? null,
      gscSiteId: input.gscSiteId ?? null
    }
  });
}