import { google } from "googleapis";

export type SheetMatrix = Array<Array<string | number | boolean | null>>;

function authClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

export async function ensureTabsExist(
  accessToken: string,
  spreadsheetId: string,
  tabs: string[] = [
    "workspace",
    "ga4_daily",
    "gsc_daily",
    "ads_daily",
    "gmb_daily",
    "semrush_daily",
    "clarity_daily",
    "rankings_snapshot",
    "insights_generated",
    "recommendations",
    "sync_health",
  ]
) {
  const sheets = google.sheets({ version: "v4", auth: authClient(accessToken) });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    (meta.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter(Boolean) as string[]
  );

  const requests = tabs
    .filter((title) => !existing.has(title))
    .map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  values: SheetMatrix
) {
  const sheets = google.sheets({ version: "v4", auth: authClient(accessToken) });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function replaceTabValues(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  values: SheetMatrix
) {
  const sheets = google.sheets({ version: "v4", auth: authClient(accessToken) });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });

  if (!values.length) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}