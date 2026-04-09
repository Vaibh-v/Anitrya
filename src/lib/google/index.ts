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