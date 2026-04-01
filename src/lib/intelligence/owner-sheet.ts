import { google } from "googleapis";
import type {
  OwnerSheetInsightRow,
  OwnerSheetRecommendationRow,
} from "@/lib/intelligence/memory-records";

const INSIGHTS_TAB = "insights_generated";
const RECOMMENDATIONS_TAB = "recommendations";

const INSIGHTS_HEADERS = [
  "workspace_id",
  "created_at",
  "insight_id",
  "title",
  "summary",
  "severity",
  "category",
  "evidence_json",
];

const RECOMMENDATIONS_HEADERS = [
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
];

function safe(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value);
}

function getServiceAccountAuth() {
  const clientEmail =
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;

  const privateKey = (
    process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || ""
  ).replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL/GOOGLE_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY/GOOGLE_PRIVATE_KEY."
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getServiceAccountAuth();
  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function ensureTabsExist(spreadsheetId: string, tabs: string[]) {
  const sheets = await getSheetsClient();
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });

  const existing = new Set(
    (metadata.data.sheets ?? [])
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

async function ensureHeaderRow(
  spreadsheetId: string,
  tab: string,
  headers: string[]
) {
  const sheets = await getSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });

  const firstRow = existing.data.values?.[0] ?? [];
  const matches =
    firstRow.length === headers.length &&
    firstRow.every((value, index) => value === headers[index]);

  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!1:1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers],
      },
    });
  }
}

function insightToValues(row: OwnerSheetInsightRow): string[] {
  return [
    safe(row.workspace_id),
    safe(row.created_at),
    safe(row.insight_id),
    safe(row.title),
    safe(row.summary),
    safe(row.severity),
    safe(row.category),
    safe(row.evidence_json),
  ];
}

function recommendationToValues(row: OwnerSheetRecommendationRow): string[] {
  return [
    safe(row.workspace_id),
    safe(row.created_at),
    safe(row.recommendation_id),
    safe(row.title),
    safe(row.why_it_matters),
    safe(row.steps_json),
    safe(row.impact),
    safe(row.effort),
    safe(row.evidence_json),
    safe(row.owner),
  ];
}

async function appendRows(
  spreadsheetId: string,
  tab: string,
  values: string[][]
) {
  if (values.length === 0) return;

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function persistOwnerMemory(input: {
  spreadsheetId: string;
  insights: OwnerSheetInsightRow[];
  recommendations: OwnerSheetRecommendationRow[];
}) {
  await ensureTabsExist(input.spreadsheetId, [INSIGHTS_TAB, RECOMMENDATIONS_TAB]);
  await ensureHeaderRow(input.spreadsheetId, INSIGHTS_TAB, INSIGHTS_HEADERS);
  await ensureHeaderRow(
    input.spreadsheetId,
    RECOMMENDATIONS_TAB,
    RECOMMENDATIONS_HEADERS
  );

  await appendRows(
    input.spreadsheetId,
    INSIGHTS_TAB,
    input.insights.map(insightToValues)
  );

  await appendRows(
    input.spreadsheetId,
    RECOMMENDATIONS_TAB,
    input.recommendations.map(recommendationToValues)
  );

  return {
    insightsWritten: input.insights.length,
    recommendationsWritten: input.recommendations.length,
  };
}