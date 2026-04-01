import { google } from "googleapis";

export type GscEntityKeywordRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type SearchAnalyticsRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

export async function gscQueryPageRows(
  accessToken: string,
  params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    rowLimit?: number;
  }
): Promise<GscEntityKeywordRow[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const webmasters = google.webmasters({ version: "v3", auth });

  const response = await webmasters.searchanalytics.query({
    siteUrl: params.siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ["query", "page"],
      rowLimit: params.rowLimit ?? 1000,
    },
  });

  return ((response.data.rows ?? []) as SearchAnalyticsRow[]).map(
    (row: SearchAnalyticsRow) => ({
      keys: row.keys ?? [],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })
  );
}