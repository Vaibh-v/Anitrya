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
    normalizedTargetTables: ["gbp_location_daily"],
    evidenceTargets: ["overview", "local", "intelligence"],
    preserved: true,
    blockerReasons: [
      "Google Business Profile performance sync requires a mapped business location before evidence can be collected.",
      "Location mapping is recorded through the server-side sync ledger until project-level GBP fields are introduced.",
    ],
    nextAction:
      "Use OAuth discovery to select a project location, then run entity sync to collect normalized GBP location performance evidence.",
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
