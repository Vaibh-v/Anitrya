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

  return cleaned.replace(/^properties\//, "").trim();
}

function buildGa4PropertyLabel(input: {
  displayName: string | null;
  propertyName: string;
  accountName: string | null;
}) {
  const propertyId = normalizeGa4PropertyId(input.propertyName);
  const name = asCleanString(input.displayName) ?? input.propertyName;
  const accountName = asCleanString(input.accountName);

  if (propertyId && accountName) {
    return `${name} (${propertyId}) · ${accountName}`;
  }

  if (propertyId) {
    return `${name} (${propertyId})`;
  }

  return name;
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

  const [ga4Record, gscRecord] = await Promise.all([
    project.ga4PropertyId
      ? prisma.ga4Property.findFirst({
          where: {
            id: project.ga4PropertyId,
            workspaceId: project.workspaceId,
          },
          select: {
            id: true,
            propertyName: true,
            displayName: true,
            accountName: true,
          },
        })
      : Promise.resolve(null),
    project.gscSiteId
      ? prisma.gscSite.findFirst({
          where: {
            id: project.gscSiteId,
            workspaceId: project.workspaceId,
          },
          select: {
            id: true,
            siteUrl: true,
            permission: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    workspaceId: project.workspaceId,
    projectId: project.id,
    projectSlug: project.slug,
    projectLabel: project.name,
    ga4PropertyRecordId: ga4Record?.id ?? null,
    ga4PropertyId: normalizeGa4PropertyId(ga4Record?.propertyName),
    ga4PropertyLabel: ga4Record ? buildGa4PropertyLabel(ga4Record) : null,
    gscSiteRecordId: gscRecord?.id ?? null,
    gscSiteUrl: asCleanString(gscRecord?.siteUrl),
    gscSiteLabel: asCleanString(gscRecord?.siteUrl),
  };
}