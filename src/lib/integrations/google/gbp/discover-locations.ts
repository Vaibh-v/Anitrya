import { IntegrationProvider } from "@prisma/client";
import type { IntegrationDiscoveryResult } from "@/lib/integrations/discovery-contracts";
import {
  GOOGLE_BUSINESS_PROFILE_SCOPE,
  type GoogleBusinessProfileLocationAsset,
} from "@/lib/integrations/google/gbp/discovery-contract";
import { resolveWorkspaceTokenRecord } from "@/lib/integrations/workspace-token-resolver";

type GoogleBusinessProfileAccount = {
  name?: string;
  accountName?: string;
  type?: string;
};

type GoogleBusinessProfileAccountsResponse = {
  accounts?: GoogleBusinessProfileAccount[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

type GoogleBusinessProfileLocation = {
  name?: string;
  title?: string;
  storeCode?: string;
  categories?: {
    primaryCategory?: {
      displayName?: string;
      name?: string;
    };
  };
  storefrontAddress?: {
    locality?: string;
    regionCode?: string;
  };
};

type GoogleBusinessProfileLocationsResponse = {
  locations?: GoogleBusinessProfileLocation[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

const ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const LOCATIONS_BASE_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
const LOCATION_READ_MASK = [
  "name",
  "title",
  "storeCode",
  "categories",
  "storefrontAddress",
].join(",");

function apiErrorMessage(input: {
  provider: string;
  status: number;
  payload: { error?: { message?: string } };
}) {
  return [
    `${input.provider} request failed with status ${input.status}.`,
    input.payload.error?.message,
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchGoogleJson<TPayload extends { error?: { message?: string } }>(
  input: {
    url: URL;
    accessToken: string;
    provider: string;
  },
): Promise<TPayload> {
  const response = await fetch(input.url.toString(), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  const payload = (await response.json()) as TPayload;

  if (!response.ok) {
    throw new Error(
      apiErrorMessage({
        provider: input.provider,
        status: response.status,
        payload,
      }),
    );
  }

  return payload;
}

async function listAccounts(accessToken: string) {
  const accounts: GoogleBusinessProfileAccount[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL(ACCOUNTS_URL);
    url.searchParams.set("pageSize", "20");

    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const payload = await fetchGoogleJson<GoogleBusinessProfileAccountsResponse>(
      {
        url,
        accessToken,
        provider: "Google Business Profile accounts",
      },
    );

    accounts.push(...(payload.accounts ?? []));
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  return accounts.filter((account) => typeof account.name === "string");
}

async function listLocationsForAccount(input: {
  accessToken: string;
  accountName: string;
}) {
  const locations: GoogleBusinessProfileLocation[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL(
      `${LOCATIONS_BASE_URL}/${input.accountName}/locations`,
    );
    url.searchParams.set("readMask", LOCATION_READ_MASK);
    url.searchParams.set("pageSize", "100");

    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const payload =
      await fetchGoogleJson<GoogleBusinessProfileLocationsResponse>({
        url,
        accessToken: input.accessToken,
        provider: "Google Business Profile locations",
      });

    locations.push(...(payload.locations ?? []));
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  return locations.filter((location) => typeof location.name === "string");
}

function toLocationAsset(input: {
  account: GoogleBusinessProfileAccount;
  location: GoogleBusinessProfileLocation;
}): GoogleBusinessProfileLocationAsset | null {
  const sourceId = input.location.name;

  if (!sourceId) {
    return null;
  }

  const primaryCategory = input.location.categories?.primaryCategory;

  return {
    provider: "google_business_profile",
    assetKind: "business_location",
    sourceId,
    displayName: input.location.title ?? sourceId,
    parentSourceId: input.account.name ?? null,
    metadata: {
      accountName: input.account.accountName ?? input.account.name ?? null,
      locationName: input.location.name ?? null,
      storeCode: input.location.storeCode ?? null,
      primaryCategory:
        primaryCategory?.displayName ?? primaryCategory?.name ?? null,
      locality: input.location.storefrontAddress?.locality ?? null,
      regionCode: input.location.storefrontAddress?.regionCode ?? null,
    },
  };
}

export async function discoverGoogleBusinessProfileLocations(input: {
  workspaceId: string;
}): Promise<IntegrationDiscoveryResult> {
  const token = await resolveWorkspaceTokenRecord({
    workspaceId: input.workspaceId,
    acceptedProviders: [
      IntegrationProvider.GOOGLE_GBP,
      IntegrationProvider.GOOGLE_GA4,
      IntegrationProvider.GOOGLE_GSC,
    ],
    requiredScopes: [GOOGLE_BUSINESS_PROFILE_SCOPE],
  });

  const accounts = await listAccounts(token.accessToken);
  const assets: GoogleBusinessProfileLocationAsset[] = [];

  for (const account of accounts) {
    if (!account.name) continue;

    const locations = await listLocationsForAccount({
      accessToken: token.accessToken,
      accountName: account.name,
    });

    for (const location of locations) {
      const asset = toLocationAsset({ account, location });
      if (asset) assets.push(asset);
    }
  }

  return {
    provider: "google_business_profile",
    status: assets.length > 0 ? "ready" : "empty",
    assets,
    reason:
      assets.length > 0
        ? `${assets.length} Business Profile location(s) discovered.`
        : "No Business Profile locations were available for the connected Google account.",
    checkedAt: new Date().toISOString(),
  };
}
