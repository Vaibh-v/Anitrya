import { google } from "googleapis";

const TAB_HEADERS: Record<string, string[]> = {
  workspace: ["workspace_id", "workspace_name", "owner_email", "created_at"],
  ga4_daily: [
    "workspace_id",
    "date",
    "property_id",
    "property_name",
    "sessions",
    "users",
    "conversions",
    "engagement_rate",
    "avg_session_duration_sec",
    "source_medium_top",
    "landing_page_top",
  ],
  gsc_daily: [
    "workspace_id",
    "date",
    "site_url",
    "clicks",
    "impressions",
    "ctr",
    "avg_position",
    "top_query",
    "top_page",
  ],
  rankings_snapshot: [
    "workspace_id",
    "date",
    "domain",
    "site_url",
    "keyword",
    "position",
    "url",
    "clicks",
    "impressions",
    "ctr",
    "search_volume",
    "kd",
    "cpc",
    "intent",
  ],
  gmb_daily: [
    "workspace_id",
    "date",
    "location_name",
    "location_title",
    "searches",
    "views",
    "calls",
    "website_clicks",
    "direction_requests",
    "messages",
  ],
  ads_daily: [
    "workspace_id",
    "date",
    "customer_id",
    "account_name",
    "impressions",
    "clicks",
    "cost_micros",
    "conversions",
    "conversion_value",
    "ctr",
    "cpc_micros",
  ],
  semrush_daily: [
    "workspace_id",
    "date",
    "domain",
    "organic_keywords",
    "organic_traffic",
    "traffic_cost",
    "visibility",
    "backlinks",
    "referring_domains",
  ],
  clarity_daily: [
    "workspace_id",
    "date",
    "site",
    "sessions",
    "rage_clicks",
    "dead_clicks",
    "quick_backs",
    "scroll_depth_avg",
    "js_errors",
    "top_page",
  ],
  insights_generated: [
    "workspace_id",
    "created_at",
    "insight_id",
    "title",
    "summary",
    "severity",
    "category",
    "evidence_json",
  ],
  recommendations: [
    "workspace_id",
    "created_at",
    "recommendation_id",
    "title",
    "why_it_matters",
    "steps_json",
    "impact",
    "effort",
    "evidence_json",
    "owner",
  ],
  sync_health: ["ran_at", "mode", "status", "message"],
};

function buildSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function ensureHeaderRow(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[]
) {
  const sheets = buildSheetsClient(accessToken);

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!1:1`,
  });

  const currentHeaders = (current.data.values?.[0] ?? []).map(String);
  const matches =
    currentHeaders.length === headers.length &&
    currentHeaders.every((value, index) => value === headers[index]);

  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!1:1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers],
      },
    });
  }
}

export async function ensureTabsExist(
  accessToken: string,
  spreadsheetId: string
) {
  const sheets = buildSheetsClient(accessToken);

  const meta = await sheets.spreadsheets.get({ spreadsheetId });

  const existingTabs = new Set(
    (meta.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  );

  const requests = Object.keys(TAB_HEADERS)
    .filter((tab) => !existingTabs.has(tab))
    .map((tab) => ({
      addSheet: {
        properties: {
          title: tab,
        },
      },
    }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  for (const [tabName, headers] of Object.entries(TAB_HEADERS)) {
    await ensureHeaderRow(accessToken, spreadsheetId, tabName, headers);
  }
}

export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  values: unknown[][]
) {
  if (values.length === 0) return;

  const sheets = buildSheetsClient(accessToken);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });
}