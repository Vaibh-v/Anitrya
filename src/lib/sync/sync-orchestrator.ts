import { prisma } from "@/lib/prisma";
import { getGoogleAccessTokenForWorkspace } from "@/lib/integrations/google/get-google-access-token";
import { fetchGA4SourceDaily } from "@/lib/integrations/google/ga4/fetch-ga4-source-daily";
import { fetchGA4LandingPageDaily } from "@/lib/integrations/google/ga4/fetch-ga4-landing";
import { fetchGSCQueryDaily } from "@/lib/integrations/google/gsc/fetch-gsc-query";
import { fetchGSCPageDaily } from "@/lib/integrations/google/gsc/fetch-gsc-page";

export type SyncProviderStatus = "success" | "error" | "skipped";

export type SyncProviderResult = {
  provider: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: SyncProviderStatus;
  rowsSynced?: number;
  reason?: string;
  details?: Record<string, unknown>;
};

export type FullSyncResult = {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
  results: SyncProviderResult[];
};

function normalizePropertyId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/^properties\//, "").trim();
  return /^\d+$/.test(cleaned) ? cleaned : null;
}

function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (
    cleaned.startsWith("sc-domain:") ||
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://")
  ) {
    return cleaned;
  }
  return null;
}

export async function runFullSync(params: {
  workspaceId: string;
  projectRef: string;
  from: string;
  to: string;
}): Promise<FullSyncResult> {
  const project = await prisma.project.findFirst({
    where: {
      workspaceId: params.workspaceId,
      OR: [{ id: params.projectRef }, { slug: params.projectRef }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      ga4PropertyId: true,
      gscSiteId: true,
    },
  });

  if (!project) {
    throw new Error("Project not found for the current workspace.");
  }

  const accessToken = await getGoogleAccessTokenForWorkspace(params.workspaceId);
  const results: SyncProviderResult[] = [];

  const ga4PropertyId = normalizePropertyId(project.ga4PropertyId);
  if (!ga4PropertyId) {
    results.push({
      provider: "GOOGLE_GA4",
      status: "skipped",
      reason: "The active project does not have a valid numeric GA4 property mapping.",
    });
  } else {
    try {
      const sourceRows = await fetchGA4SourceDaily({
        workspaceId: params.workspaceId,
        projectSlug: project.slug,
        propertyId: ga4PropertyId,
        accessToken,
        from: params.from,
        to: params.to,
      });

      const landingRows = await fetchGA4LandingPageDaily({
        workspaceId: params.workspaceId,
        projectSlug: project.slug,
        propertyId: ga4PropertyId,
        accessToken,
        from: params.from,
        to: params.to,
      });

      results.push({
        provider: "GOOGLE_GA4",
        status: "success",
        rowsSynced: sourceRows + landingRows,
        details: {
          sourceRows,
          landingRows,
          propertyId: ga4PropertyId,
        },
      });
    } catch (error) {
      results.push({
        provider: "GOOGLE_GA4",
        status: "error",
        reason: error instanceof Error ? error.message : "GA4 sync failed.",
      });
    }
  }

  const gscSiteUrl = normalizeSiteUrl(project.gscSiteId);
  if (!gscSiteUrl) {
    results.push({
      provider: "GOOGLE_GSC",
      status: "skipped",
      reason: "The active project does not have a valid Search Console site mapping.",
    });
  } else {
    try {
      const queryRows = await fetchGSCQueryDaily({
        workspaceId: params.workspaceId,
        projectSlug: project.slug,
        siteUrl: gscSiteUrl,
        accessToken,
        from: params.from,
        to: params.to,
      });

      const pageRows = await fetchGSCPageDaily({
        workspaceId: params.workspaceId,
        projectSlug: project.slug,
        siteUrl: gscSiteUrl,
        accessToken,
        from: params.from,
        to: params.to,
      });

      results.push({
        provider: "GOOGLE_GSC",
        status: "success",
        rowsSynced: queryRows + pageRows,
        details: {
          queryRows,
          pageRows,
          siteUrl: gscSiteUrl,
        },
      });
    } catch (error) {
      results.push({
        provider: "GOOGLE_GSC",
        status: "error",
        reason: error instanceof Error ? error.message : "GSC sync failed.",
      });
    }
  }

  return {
    workspaceId: params.workspaceId,
    projectId: project.id,
    projectSlug: project.slug,
    projectLabel: project.name,
    from: params.from,
    to: params.to,
    results,
  };
}