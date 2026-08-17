import { google } from "googleapis";

export type GAPropertyOption = {
  id: string;
  label: string;
};

export type GSCSiteOption = {
  id: string;
  label: string;
};

function buildOAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

type SessionWithAccessToken = {
  accessToken?: string | null;
};

type GscQueryPageOptions = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
};

type Ga4ReportOptions = {
  startDate: string;
  endDate: string;
  limit?: number;
};

type GoogleApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export function getAccessToken(session: SessionWithAccessToken): string {
  const accessToken = session.accessToken?.trim();

  if (!accessToken) {
    throw new Error("Google access token is missing from the current session.");
  }

  return accessToken;
}

function normalizePropertyName(propertyName: string) {
  const cleaned = propertyName.trim();
  return cleaned.startsWith("properties/") ? cleaned : `properties/${cleaned}`;
}

async function readGoogleJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = (await response.json()) as T & GoogleApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload;
}

export async function gaListProperties(
  accessToken: string,
): Promise<GAPropertyOption[]> {
  const auth = buildOAuthClient(accessToken);

  const analyticsAdmin = google.analyticsadmin({
    version: "v1beta",
    auth,
  });

  const response = await analyticsAdmin.accountSummaries.list({
    pageSize: 200,
  });

  const accountSummaries = response.data.accountSummaries ?? [];
  const properties: GAPropertyOption[] = [];

  for (const account of accountSummaries) {
    for (const property of account.propertySummaries ?? []) {
      const rawProperty = property.property ?? "";
      const propertyId = rawProperty.replace("properties/", "").trim();

      if (!propertyId) {
        continue;
      }

      properties.push({
        id: propertyId,
        label: `${property.displayName ?? "Unnamed property"} (${propertyId})`,
      });
    }
  }

  return properties;
}

export async function gscListSites(
  accessToken: string,
): Promise<GSCSiteOption[]> {
  const auth = buildOAuthClient(accessToken);

  const searchConsole = google.searchconsole({
    version: "v1",
    auth,
  });

  const response = await searchConsole.sites.list();
  const entries = response.data.siteEntry ?? [];

  return entries
    .map((entry) => {
      const siteUrl = entry.siteUrl?.trim();

      if (!siteUrl) {
        return null;
      }

      return {
        id: siteUrl,
        label: siteUrl,
      };
    })
    .filter((value): value is GSCSiteOption => value !== null);
}

export async function gscQueryPageRows(
  accessToken: string,
  options: GscQueryPageOptions,
) {
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      options.siteUrl,
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ["query", "page"],
        rowLimit: options.rowLimit ?? 1000,
      }),
    },
  );

  const payload = await readGoogleJson<{
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  }>(response, `GSC query/page request failed for ${options.siteUrl}.`);

  return payload.rows ?? [];
}

export async function gaLandingPageRows(
  accessToken: string,
  propertyName: string,
  options: Ga4ReportOptions,
) {
  const normalizedPropertyName = normalizePropertyName(propertyName);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${normalizedPropertyName}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
        dimensions: [{ name: "landingPage" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "conversions" },
          { name: "engagementRate" },
        ],
        limit: options.limit ?? 1000,
      }),
    },
  );

  const payload = await readGoogleJson<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string | null }>;
      metricValues?: Array<{ value?: string | null }>;
    }>;
  }>(response, `GA4 landing-page request failed for ${normalizedPropertyName}.`);

  return payload.rows ?? [];
}

export async function gaSourceMediumRows(
  accessToken: string,
  propertyName: string,
  options: Ga4ReportOptions,
) {
  const normalizedPropertyName = normalizePropertyName(propertyName);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${normalizedPropertyName}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "conversions" },
          { name: "engagementRate" },
        ],
        limit: options.limit ?? 250,
      }),
    },
  );

  const payload = await readGoogleJson<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string | null }>;
      metricValues?: Array<{ value?: string | null }>;
    }>;
  }>(response, `GA4 source/medium request failed for ${normalizedPropertyName}.`);

  return payload.rows ?? [];
}
