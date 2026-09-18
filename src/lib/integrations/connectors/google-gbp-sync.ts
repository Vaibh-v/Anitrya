import type {
  IntegrationSyncContext,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import { getLatestGbpLocationMapping } from "@/lib/integrations/google/gbp/location-mapping-ledger";

export const googleGbpSyncRunner: IntegrationSyncRunner = {
  provider: "GOOGLE_GBP",

  canRun() {
    return true;
  },

  skipReason() {
    return "Google Business Profile performance sync is not active yet.";
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

    return {
      provider: "GOOGLE_GBP",
      status: "skipped",
      reason:
        "Google Business Profile location is mapped, but normalized GBP evidence storage is not active yet.",
      rowsSynced: 0,
      details: {
        locationName: mapping.locationName,
        displayName: mapping.displayName,
        accountName: mapping.accountName,
        storeCode: mapping.storeCode,
        primaryCategory: mapping.primaryCategory,
        locality: mapping.locality,
        regionCode: mapping.regionCode,
      },
    };
  },
};