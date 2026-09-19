import type {
  IntegrationSyncContext,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import { IntegrationProvider } from "@prisma/client";
import { getLatestGbpLocationMapping } from "@/lib/integrations/google/gbp/location-mapping-ledger";
import { resolveWorkspaceTokenRecord } from "@/lib/integrations/workspace-token-resolver";
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "@/lib/integrations/google/gbp/discovery-contract";
import {
  fetchGbpLocationDaily,
  GBP_LOCATION_DAILY_METRICS,
} from "@/lib/integrations/google/gbp/fetch-gbp-location-daily";

export const googleGbpSyncRunner: IntegrationSyncRunner = {
  provider: "GOOGLE_GBP",

  canRun() {
    return true;
  },

  skipReason() {
    return "This project does not have a mapped Google Business Profile location.";
  },

  async sync(context: IntegrationSyncContext) {
    const mapping = await getLatestGbpLocationMapping({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
    });

    if (!mapping) {
      return {
        provider: "GOOGLE_GBP",
        status: "skipped",
        reason: "This project does not have a mapped Google Business Profile location.",
        rowsSynced: 0,
      };
    }

    const token = await resolveWorkspaceTokenRecord({
      workspaceId: context.workspaceId,
      acceptedProviders: [
        IntegrationProvider.GOOGLE_GBP,
        IntegrationProvider.GOOGLE_GA4,
        IntegrationProvider.GOOGLE_GSC,
      ],
      requiredScopes: [GOOGLE_BUSINESS_PROFILE_SCOPE],
    });

    const rowsSynced = await fetchGbpLocationDaily({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
      locationName: mapping.locationName,
      locationLabel: mapping.displayName,
      accountName: mapping.accountName,
      accessToken: token.accessToken,
      from: context.from,
      to: context.to,
    });

    return {
      provider: "GOOGLE_GBP",
      status: "success",
      reason: `${rowsSynced} Google Business Profile performance row(s) synced.`,
      rowsSynced,
      details: {
        locationName: mapping.locationName,
        displayName: mapping.displayName,
        accountName: mapping.accountName,
        storeCode: mapping.storeCode,
        primaryCategory: mapping.primaryCategory,
        locality: mapping.locality,
        regionCode: mapping.regionCode,
        metricCount: GBP_LOCATION_DAILY_METRICS.length,
      },
    };
  },
};
