import { google } from "googleapis";

export async function gscListSites(
  accessToken: string
): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const webmasters = google.webmasters({
    version: "v3",
    auth,
  });

  const response = await webmasters.sites.list();

  return (response.data.siteEntry ?? [])
    .map((site) => ({
      siteUrl: site.siteUrl ?? "",
      permissionLevel: site.permissionLevel ?? "unknown",
    }))
    .filter((site) => site.siteUrl.length > 0);
}

export async function gscQueryKeywords(
  accessToken: string,
  params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  }
): Promise<
  Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>
> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const webmasters = google.webmasters({
    version: "v3",
    auth,
  });

  const response = await webmasters.searchanalytics.query({
    siteUrl: params.siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions ?? ["query", "page"],
      rowLimit: params.rowLimit ?? 250,
    },
  });

  return (response.data.rows ?? []).map((row) => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}