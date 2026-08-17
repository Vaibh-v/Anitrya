import type {
  IntegrationDiscoveryAsset,
  IntegrationDiscoveryContract,
  IntegrationDiscoveryResult,
} from "@/lib/integrations/discovery-contracts";

export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_ADS_DEVELOPER_TOKEN_ENV = "GOOGLE_ADS_DEVELOPER_TOKEN";

export const googleAdsDiscoveryContract: IntegrationDiscoveryContract = {
  provider: "google_ads",
  label: "Google Ads",
  connectionMode: "oauth",
  requiredScopes: [GOOGLE_ADS_SCOPE],
  assetKind: "ads_account",
  requiresWorkspaceToken: true,
  requiresProjectMapping: true,
  normalizedTargetTables: [],
  evidenceTargets: ["overview", "paid_media", "intelligence"],
  preserved: true,
  blockerReasons: [
    "Google Ads discovery requires a workspace Google OAuth token with the Ads scope.",
    "Google Ads API calls require a server-side developer token before customer discovery can run.",
    "Google Ads customer mapping and normalized paid-media evidence tables are not active yet.",
  ],
  nextAction:
    "Set GOOGLE_ADS_DEVELOPER_TOKEN server-side, discover accessible Google Ads customers, then add project-to-customer mapping before enabling paid-media sync.",
};

export type GoogleAdsAccountAsset = IntegrationDiscoveryAsset & {
  provider: "google_ads";
  assetKind: "ads_account";
  metadata: {
    resourceName: string;
    customerId: string;
    apiVersion: string;
    loginCustomerId: string | null;
  };
};

export function buildPreservedGoogleAdsDiscoveryResult(): IntegrationDiscoveryResult {
  return {
    provider: googleAdsDiscoveryContract.provider,
    status: "preserved",
    assets: [],
    reason:
      "Google Ads discovery is contracted but remains inactive until OAuth access, developer-token configuration, customer mapping, and normalized paid-media storage are wired server-side.",
    checkedAt: new Date().toISOString(),
  };
}
