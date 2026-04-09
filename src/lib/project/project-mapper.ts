import { prisma } from "@/lib/prisma";

export type ResolvedProjectMapping = {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  ga4PropertyRecordId: string | null;
  ga4PropertyId: string | null;
  ga4PropertyLabel: string | null;
  gscSiteRecordId: string | null;
  gscSiteUrl: string | null;
  gscSiteLabel: string | null;
};

type Input = {
  workspaceId: string;
  ref?: string | null;
};

function asCleanString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeGa4PropertyId(value: string | null | undefined): string | null {
  const cleaned = asCleanString(value);

  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/\d+/);
  return match?.[0] ?? cleaned;
}

export async function getProjectMapping(
  input: Input,
): Promise<ResolvedProjectMapping> {
  const workspaceId = asCleanString(input.workspaceId);

  if (!workspaceId) {
    throw new Error("workspaceId is required.");
  }

  const ref = asCleanString(input.ref);

  const project = await prisma.project.findFirst({
    where: ref
      ? {
          workspaceId,
          OR: [{ id: ref }, { slug: ref }, { name: ref }],
        }
      : {
          workspaceId,
        },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
    throw new Error("Project not found.");
  }

  const ga4Record = project.ga4PropertyId
    ? await prisma.ga4Property.findUnique({
        where: {
          id: project.ga4PropertyId,
        },
        select: {
          id: true,
          propertyName: true,
          accountName: true,
        },
      })
    : null;

  const gscRecord = project.gscSiteId
    ? await prisma.gscSite.findUnique({
        where: {
          id: project.gscSiteId,
        },
        select: {
          id: true,
          siteUrl: true,
          label: true,
        },
      })
    : null;

  const ga4PropertyId = normalizeGa4PropertyId(ga4Record?.propertyName);
  const ga4PropertyLabel =
    asCleanString(ga4Record?.accountName) ??
    asCleanString(ga4Record?.propertyName) ??
    ga4PropertyId;

  const gscSiteUrl = asCleanString(gscRecord?.siteUrl);
  const gscSiteLabel =
    asCleanString(gscRecord?.label) ??
    asCleanString(gscRecord?.siteUrl);

  return {
    workspaceId: project.workspaceId,
    projectId: project.id,
    projectSlug: project.slug,
    projectLabel: project.name,
    ga4PropertyRecordId: ga4Record?.id ?? null,
    ga4PropertyId,
    ga4PropertyLabel,
    gscSiteRecordId: gscRecord?.id ?? null,
    gscSiteUrl,
    gscSiteLabel,
  };
}