import { IntegrationProvider } from "@prisma/client";
import type { IntegrationDiscoveryResult } from "@/lib/integrations/discovery-contracts";
import {
  GOOGLE_ADS_DEVELOPER_TOKEN_ENV,
  GOOGLE_ADS_SCOPE,
  type GoogleAdsAccountAsset,
} from "@/lib/integrations/google/ads/discovery-contract";
import { resolveWorkspaceTokenRecord } from "@/lib/integrations/workspace-token-resolver";

type GoogleAdsAccessibleCustomersResponse = {
  resourceNames?: string[];
  error?: {
    message?: string;
  };
};

const DEFAULT_GOOGLE_ADS_API_VERSION = "v25";
const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com";

function normalizeCustomerId(resourceName: string) {
  return resourceName.replace(/^customers\//, "");
}

function normalizedLoginCustomerId() {
  return process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, "") || null;
}

function apiErrorMessage(input: {
  status: number;
  payload: GoogleAdsAccessibleCustomersResponse;
}) {
  return [
    `Google Ads discovery request failed with status ${input.status}.`,
    input.payload.error?.message,
  ]
    .filter(Boolean)
    .join(" ");
}

async function listAccessibleCustomers(input: {
  accessToken: string;
  developerToken: string;
  apiVersion: string;
  loginCustomerId: string | null;
}) {
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/${input.apiVersion}/customers:listAccessibleCustomers`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        "developer-token": input.developerToken,
        ...(input.loginCustomerId
          ? { "login-customer-id": input.loginCustomerId }
          : {}),
      },
    },
  );

  const payload = (await response.json()) as GoogleAdsAccessibleCustomersResponse;

  if (!response.ok) {
    return {
      ok: false as const,
      message: apiErrorMessage({ status: response.status, payload }),
    };
  }

  return {
    ok: true as const,
    resourceNames: payload.resourceNames ?? [],
  };
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
  const result = await listAccessibleCustomers({
    accessToken: token.accessToken,
    developerToken,
    apiVersion,
    loginCustomerId,
  });

  if (!result.ok) {
    return {
      provider: "google_ads",
      status: "error",
      assets: [],
      reason: result.message,
      checkedAt: new Date().toISOString(),
    };
  }

  const assets: GoogleAdsAccountAsset[] = result.resourceNames.map(
    (resourceName) => {
      const customerId = normalizeCustomerId(resourceName);

      return {
        provider: "google_ads",
        assetKind: "ads_account",
        sourceId: resourceName,
        displayName: customerId,
        parentSourceId: loginCustomerId,
        metadata: {
          resourceName,
          customerId,
          apiVersion,
          loginCustomerId,
        },
      };
    },
  );

  return {
    provider: "google_ads",
    status: assets.length > 0 ? "ready" : "empty",
    assets,
    reason:
      assets.length > 0
        ? `${assets.length} Google Ads account(s) discovered.`
        : "No Google Ads accounts were directly accessible for the connected Google account.",
    checkedAt: new Date().toISOString(),
  };
}
