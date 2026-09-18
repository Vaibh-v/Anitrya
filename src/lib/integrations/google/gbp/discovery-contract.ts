import type {
  IntegrationDiscoveryAsset,
  IntegrationDiscoveryContract,
  IntegrationDiscoveryResult,
} from "@/lib/integrations/discovery-contracts";

export const GOOGLE_BUSINESS_PROFILE_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

export const googleBusinessProfileDiscoveryContract: IntegrationDiscoveryContract =
  {
    provider: "google_business_profile",
    label: "Google Business Profile",
    connectionMode: "oauth",
    requiredScopes: [GOOGLE_BUSINESS_PROFILE_SCOPE],
    assetKind: "business_location",
    requiresWorkspaceToken: true,
    requiresProjectMapping: true,
    normalizedTargetTables: [],
    evidenceTargets: ["overview", "local", "intelligence"],
    preserved: true,
    blockerReasons: [
      "OAuth discovery is available, but Business Profile performance sync is not active yet.",
      "Location mapping is recorded through the server-side sync ledger until dedicated GBP storage is introduced.",
      "Normalized GBP evidence tables are not yet present in the project schema.",
    ],
    nextAction:
      "Use OAuth discovery to select a project location, then introduce normalized GBP evidence storage before enabling sync.",
  };

export type GoogleBusinessProfileLocationAsset = IntegrationDiscoveryAsset & {
  provider: "google_business_profile";
  assetKind: "business_location";
  metadata: {
    accountName: string | null;
    locationName: string | null;
    storeCode: string | null;
    primaryCategory: string | null;
    locality: string | null;
    regionCode: string | null;
  };
};

export function buildPreservedGoogleBusinessProfileDiscoveryResult(): IntegrationDiscoveryResult {
  return {
    provider: googleBusinessProfileDiscoveryContract.provider,
    status: "preserved",
    assets: [],
    reason:
      "Google Business Profile discovery is preserved until OAuth discovery can run for the connected workspace.",
    checkedAt: new Date().toISOString(),
  };
}
