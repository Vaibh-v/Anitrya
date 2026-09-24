import { IntegrationProvider } from "@prisma/client";
import type { IntegrationDiscoveryResult } from "@/lib/integrations/discovery-contracts";
import {
  GOOGLE_ADS_DEVELOPER_TOKEN_ENV,
  GOOGLE_ADS_SCOPE,
  type GoogleAdsAccountAsset,
} from "@/lib/integrations/google/ads/discovery-contract";
import { listAccessibleGoogleAdsCustomers } from "@/lib/integrations/google/ads/accessible-customers";
import { resolveWorkspaceTokenRecord } from "@/lib/integrations/workspace-token-resolver";

const DEFAULT_GOOGLE_ADS_API_VERSION = "v25";

function normalizedLoginCustomerId() {
  return process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, "") || null;
}

export async function discoverGoogleAdsAccounts(input: {
  workspaceId: string;
}): Promise<IntegrationDiscoveryResult> {
  const token = await resolveWorkspaceTokenRecord({
    workspaceId: input.workspaceId,
    acceptedProviders: [
      IntegrationProvider.GOOGLE_ADS,
      IntegrationProvider.GOOGLE_GA4,
      IntegrationProvider.GOOGLE_GSC,
    ],
    requiredScopes: [GOOGLE_ADS_SCOPE],
  });

  const developerToken = process.env[GOOGLE_ADS_DEVELOPER_TOKEN_ENV];

  if (!developerToken) {
    return {
      provider: "google_ads",
      status: "blocked",
      assets: [],
      reason:
        "Google Ads OAuth access is available, but GOOGLE_ADS_DEVELOPER_TOKEN is missing on the server. Add the developer token before customer discovery can run.",
      checkedAt: new Date().toISOString(),
    };
  }

  const apiVersion =
    process.env.GOOGLE_ADS_API_VERSION ?? DEFAULT_GOOGLE_ADS_API_VERSION;
  const loginCustomerId = normalizedLoginCustomerId();
  let result;
  try {
    result = await listAccessibleGoogleAdsCustomers({
      accessToken: token.accessToken,
      developerToken,
      apiVersion,
      loginCustomerId,
    });
  } catch (error) {
    return {
      provider: "google_ads",
      status: "error",
      assets: [],
      reason: error instanceof Error ? error.message : "Google Ads discovery failed.",
      checkedAt: new Date().toISOString(),
    };
  }

  const assets: GoogleAdsAccountAsset[] = result.customers.map(
    ({ customerId, displayName, loginCustomerId: accountLoginCustomerId }) => {
      const resourceName = `customers/${customerId}`;
      return {
        provider: "google_ads",
        assetKind: "ads_account",
        sourceId: resourceName,
        displayName,
        parentSourceId: accountLoginCustomerId,
        metadata: {
          resourceName,
          customerId,
          apiVersion,
          loginCustomerId: accountLoginCustomerId,
        },
      };
    },
  );

  return {
    provider: "google_ads",
    status: assets.length > 0 ? "ready" : "empty",
    assets,
    reason:
      result.warnings.length > 0
        ? `${assets.length} Google Ads account(s) discovered. ${result.warnings.join(" ")}`
        : assets.length > 0
        ? `${assets.length} Google Ads account(s) discovered.`
        : "No Google Ads accounts were directly accessible for the connected Google account.",
    checkedAt: new Date().toISOString(),
  };
}
