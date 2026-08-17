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
      "OAuth discovery contract is defined, but no Business Profile discovery runner is active yet.",
      "Location mapping storage is not yet present in the project schema.",
      "Normalized GBP evidence tables are not yet present in the project schema.",
    ],
    nextAction:
      "Add a server-side discovery runner that lists accessible accounts and locations, then introduce location mapping storage before enabling sync.",
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
      "Google Business Profile discovery is contracted but remains inactive until OAuth discovery, location mapping, and normalized evidence storage are wired server-side.",
    checkedAt: new Date().toISOString(),
  };
}
