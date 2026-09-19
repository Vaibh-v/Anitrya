import { IntegrationProvider } from "@prisma/client";
import type {
  IntegrationSyncContext,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import { GOOGLE_ADS_SCOPE } from "@/lib/integrations/google/ads/discovery-contract";
import { getLatestGoogleAdsAccountMapping } from "@/lib/integrations/google/ads/account-mapping-ledger";
import { fetchGoogleAdsCampaignDaily } from "@/lib/integrations/google/ads/fetch-google-ads-campaign-daily";
import { resolveWorkspaceTokenRecord } from "@/lib/integrations/workspace-token-resolver";

export const googleAdsSyncRunner: IntegrationSyncRunner = {
  provider: "GOOGLE_ADS",

  canRun() {
    return true;
  },

  skipReason() {
    return "This project does not have a mapped Google Ads customer.";
  },

  async sync(context: IntegrationSyncContext) {
    const mapping = await getLatestGoogleAdsAccountMapping({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
    });

    if (!mapping) {
      return {
        provider: "GOOGLE_ADS",
        status: "skipped",
        reason: "This project does not have a mapped Google Ads customer.",
        rowsSynced: 0,
      };
    }

    const token = await resolveWorkspaceTokenRecord({
      workspaceId: context.workspaceId,
      acceptedProviders: [
        IntegrationProvider.GOOGLE_ADS,
        IntegrationProvider.GOOGLE_GA4,
        IntegrationProvider.GOOGLE_GSC,
      ],
      requiredScopes: [GOOGLE_ADS_SCOPE],
    });

    const rowsSynced = await fetchGoogleAdsCampaignDaily({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
      customerId: mapping.customerId,
      loginCustomerId: mapping.loginCustomerId,
      accessToken: token.accessToken,
      from: context.from,
      to: context.to,
    });

    return {
      provider: "GOOGLE_ADS",
      status: "success",
      reason: `${rowsSynced} Google Ads campaign row(s) synced.`,
      rowsSynced,
      details: {
        customerId: mapping.customerId,
        displayName: mapping.displayName,
        loginCustomerId: mapping.loginCustomerId,
      },
    };
  },
};
