import { fetchGSCPageDaily } from "@/lib/integrations/google/gsc/fetch-gsc-page";
import { fetchGSCQueryDaily } from "@/lib/integrations/google/gsc/fetch-gsc-query";
import type {
  IntegrationSyncContext,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import { getGoogleSearchConsoleAccessTokenForWorkspace } from "@/lib/google/tokens";

export const googleGscSyncRunner: IntegrationSyncRunner = {
  provider: "GOOGLE_GSC",

  canRun(context: IntegrationSyncContext) {
    return Boolean(context.mapping.gscSiteUrl);
  },

  skipReason() {
    return "This project does not have a mapped Search Console site.";
  },

  async sync(context: IntegrationSyncContext) {
    const siteUrl = context.mapping.gscSiteUrl;

    if (!siteUrl) {
      return {
        provider: "GOOGLE_GSC",
        status: "skipped",
        reason: this.skipReason(context),
        rowsSynced: 0,
      };
    }

    const accessToken = await getGoogleSearchConsoleAccessTokenForWorkspace(
      context.workspaceId,
    );

    const [queryRows, pageRows] = await Promise.all([
      fetchGSCQueryDaily({
        workspaceId: context.workspaceId,
        projectSlug: context.mapping.projectSlug,
        siteUrl,
        accessToken,
        from: context.from,
        to: context.to,
      }),
      fetchGSCPageDaily({
        workspaceId: context.workspaceId,
        projectSlug: context.mapping.projectSlug,
        siteUrl,
        accessToken,
        from: context.from,
        to: context.to,
      }),
    ]);

    const total = queryRows + pageRows;

    return {
      provider: "GOOGLE_GSC",
      status: "success",
      reason: `${total} rows synced`,
      rowsSynced: total,
    };
  },
};
