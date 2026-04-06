import { getProjectMapping } from "@/lib/project/project-mapper";
import { resolveWorkspaceToken } from "@/lib/integrations/workspace-token-resolver";
import { runGA4Sync } from "@/lib/sync/providers/ga4-runner";
import { runGSCSync } from "@/lib/sync/providers/gsc-runner";

export type SyncProviderResult = {
  provider: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: "success" | "error" | "skipped";
  rowsSynced?: number;
  details?: Record<string, unknown>;
  reason?: string;
};

export type FullSyncResult = {
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  workspaceId: string;
  from: string;
  to: string;
  results: SyncProviderResult[];
};

export async function runFullSync(params: {
  workspaceId: string;
  projectRef: string;
  from: string;
  to: string;
}): Promise<FullSyncResult> {
  const mapping = await getProjectMapping({
    projectRef: params.projectRef,
    workspaceId: params.workspaceId,
  });

  const results: SyncProviderResult[] = [];

  if (mapping.ga4PropertyId) {
    try {
      const ga4Token = await resolveWorkspaceToken({
        workspaceId: mapping.workspaceId,
        acceptedProviders: ["GOOGLE_GA4"],
      });

      const output = await runGA4Sync({
        accessToken: ga4Token,
        propertyId: mapping.ga4PropertyId,
        workspaceId: mapping.workspaceId,
        projectId: mapping.projectSlug,
        from: params.from,
        to: params.to,
      });

      results.push({
        provider: "GOOGLE_GA4",
        status: "success",
        rowsSynced: output.rowsSynced,
        details: output as Record<string, unknown>,
      });
    } catch (error) {
      results.push({
        provider: "GOOGLE_GA4",
        status: "error",
        reason: error instanceof Error ? error.message : "GA4 sync failed.",
      });
    }
  } else {
    results.push({
      provider: "GOOGLE_GA4",
      status: "skipped",
      reason: "The active project is not mapped to a GA4 property.",
    });
  }

  if (mapping.gscSiteUrl) {
    try {
      const gscToken = await resolveWorkspaceToken({
        workspaceId: mapping.workspaceId,
        acceptedProviders: ["GOOGLE_GSC"],
      });

      const output = await runGSCSync({
        accessToken: gscToken,
        siteUrl: mapping.gscSiteUrl,
        workspaceId: mapping.workspaceId,
        projectId: mapping.projectSlug,
        from: params.from,
        to: params.to,
      });

      results.push({
        provider: "GOOGLE_GSC",
        status: "success",
        rowsSynced: output.rowsSynced,
        details: output as Record<string, unknown>,
      });
    } catch (error) {
      results.push({
        provider: "GOOGLE_GSC",
        status: "error",
        reason: error instanceof Error ? error.message : "GSC sync failed.",
      });
    }
  } else {
    results.push({
      provider: "GOOGLE_GSC",
      status: "skipped",
      reason: "The active project is not mapped to a GSC site.",
    });
  }

  return {
    projectId: mapping.projectId,
    projectSlug: mapping.projectSlug,
    projectLabel: mapping.projectLabel,
    workspaceId: mapping.workspaceId,
    from: params.from,
    to: params.to,
    results,
  };
}