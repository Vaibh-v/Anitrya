import { fetchGA4LandingPageDaily } from "@/lib/integrations/google/ga4/fetch-ga4-landing";
import { fetchGA4SourceDaily } from "@/lib/integrations/google/ga4/fetch-ga4-source-daily";
import type {
  IntegrationSyncContext,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import { getGoogleAnalyticsAccessTokenForWorkspace } from "@/lib/google/tokens";

export const googleGa4SyncRunner: IntegrationSyncRunner = {
  provider: "GOOGLE_GA4",

  canRun(context: IntegrationSyncContext) {
    return Boolean(context.mapping.ga4PropertyId);
  },

  skipReason() {
    return "This project does not have a mapped GA4 property.";
  },

  async sync(context: IntegrationSyncContext) {
    const propertyId = context.mapping.ga4PropertyId;

    if (!propertyId) {
      return {
        provider: "GOOGLE_GA4",
        status: "skipped",
        reason: this.skipReason(context),
        rowsSynced: 0,
      };
    }

    const accessToken = await getGoogleAnalyticsAccessTokenForWorkspace(
      context.workspaceId,
    );

    const [sourceRows, landingRows] = await Promise.all([
      fetchGA4SourceDaily({
        workspaceId: context.workspaceId,
        projectSlug: context.mapping.projectSlug,
        propertyId,
        accessToken,
        from: context.from,
        to: context.to,
      }),
      fetchGA4LandingPageDaily({
        workspaceId: context.workspaceId,
        projectSlug: context.mapping.projectSlug,
        propertyId,
        accessToken,
        from: context.from,
        to: context.to,
      }),
    ]);

    const total = sourceRows + landingRows;

    return {
      provider: "GOOGLE_GA4",
      status: "success",
      reason: `${total} rows synced`,
      rowsSynced: total,
      details: {
        sourceRows,
        landingRows,
        propertyId,
      },
    };
  },
};
