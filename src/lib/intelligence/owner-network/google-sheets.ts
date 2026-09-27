import { google, sheets_v4 } from "googleapis";
import { founderSheetsAuth, serviceAccountConfigured } from "@/lib/intelligence/owner-network/owner-auth";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is missing.`);
  }
  return value;
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

function getSheetsJwt() {
  const clientEmail = requireEnv("GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(
    requireEnv("GOOGLE_SHEETS_PRIVATE_KEY"),
  );

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// Sheets allows 60 reads and 60 writes per minute per user. Exports run in the
// background, so on 429 (or a transient 5xx) wait and retry instead of failing.
const RETRY = {
  retry: 6,
  retryDelay: 2000,
  retryDelayMultiplier: 2,
  maxRetryDelay: 32_000,
  httpMethodsToRetry: ["GET", "HEAD", "PUT", "POST", "OPTIONS"],
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ] as [number, number][],
};

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  // Prefer the service account; otherwise write as the founder's Google sign-in.
  if (!serviceAccountConfigured()) {
    return google.sheets({ version: "v4", auth: await founderSheetsAuth(), retryConfig: RETRY });
  }
  const auth = getSheetsJwt();
  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
    retryConfig: RETRY,
  });
}

async function getSpreadsheet(
  spreadsheetId: string,
): Promise<sheets_v4.Schema$Spreadsheet> {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  return response.data;
}

async function ensureSpreadsheetTabs(args: {
  spreadsheetId: string;
  tabNames: string[];
}) {
  const { spreadsheetId, tabNames } = args;

  const spreadsheet = await getSpreadsheet(spreadsheetId);
  const existingTitles = new Set(
    (spreadsheet.sheets ?? [])
      .map((sheet) => sheet.properties?.title ?? "")
      .filter(Boolean),
  );

  const missing = tabNames.filter((tabName) => !existingTitles.has(tabName));

  if (missing.length === 0) {
    return;
  }

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: {
          properties: { title },
        },
      })),
    },
  });
}

export async function readSheetValues(
  spreadsheetId: string,
  tabName: string,
): Promise<string[][]> {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
  });

  return (response.data.values ?? []).map((row) =>
    row.map((value) => String(value)),
  );
}

export async function appendRows(
  spreadsheetId: string,
  tabName: string,
  rows: string[][],
) {
  if (rows.length === 0) {
    return;
  }

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });
}

export async function clearAndWriteSheet(
  spreadsheetId: string,
  tabName: string,
  rows: string[][],
) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
  });

  if (rows.length === 0) {
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}

const structureChecked = new Map<string, number>();

export async function ensureSheetStructure(
  spreadsheetId: string,
  schema: Record<string, string[]>,
) {
  // Each check costs 1 + N reads; skip repeats within 10 minutes to stay under
  // the 60-reads-per-minute quota.
  const memoKey = `${spreadsheetId}:${JSON.stringify(schema)}`;
  const checkedAt = structureChecked.get(memoKey);
  if (checkedAt && Date.now() - checkedAt < 10 * 60_000) return;
  await ensureSheetStructureUncached(spreadsheetId, schema);
  structureChecked.set(memoKey, Date.now());
}

async function ensureSheetStructureUncached(
  spreadsheetId: string,
  schema: Record<string, string[]>,
) {
  const tabNames = Object.keys(schema);
  await ensureSpreadsheetTabs({ spreadsheetId, tabNames });

  // One batched read of just the header rows instead of one full read per tab.
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabNames.map((tabName) => `${tabName}!1:1`),
  });
  const headers = (response.data.valueRanges ?? []).map((range) => (range.values?.[0] ?? []).map((value) => String(value)));

  for (const [index, tabName] of tabNames.entries()) {
    const expectedHeader = schema[tabName];
    const header = headers[index] ?? [];

    if (header.length === 0) {
      await clearAndWriteSheet(spreadsheetId, tabName, [expectedHeader]);
      continue;
    }

    const sameHeader =
      header.length === expectedHeader.length &&
      header.every((value, i) => value === expectedHeader[i]);

    if (!sameHeader) {
      const existing = await readSheetValues(spreadsheetId, tabName);
      await clearAndWriteSheet(spreadsheetId, tabName, [
        expectedHeader,
        ...existing.slice(1),
      ]);
    }
  }
}

export async function upsertRowByKey(args: {
  spreadsheetId: string;
  tabName: string;
  headers: string[];
  keyHeader: string;
  row: Record<string, string>;
}) {
  const { spreadsheetId, tabName, headers, keyHeader, row } = args;

  await ensureSheetStructure(spreadsheetId, {
    [tabName]: headers,
  });

  const existing = await readSheetValues(spreadsheetId, tabName);
  const headerRow = existing[0] ?? headers;
  const keyIndex = headerRow.indexOf(keyHeader);

  if (keyIndex < 0) {
    throw new Error(`Key header "${keyHeader}" not found in tab "${tabName}".`);
  }

  const rowValues = headerRow.map((header) => row[header] ?? "");
  const keyValue = row[keyHeader] ?? "";

  const bodyRows = existing.slice(1);
  const existingIndex = bodyRows.findIndex(
    (bodyRow) => (bodyRow[keyIndex] ?? "") === keyValue,
  );

  if (existingIndex >= 0) {
    bodyRows[existingIndex] = rowValues;
  } else {
    bodyRows.push(rowValues);
  }

  await clearAndWriteSheet(spreadsheetId, tabName, [headerRow, ...bodyRows]);
}
/**
 * Batched helpers (added for the owner evidence mirror). They keep the number
 * of Sheets API calls per export constant (~4) instead of 4–5 per tab, which
 * matters for the 60 requests/minute/user Sheets quota.
 */
export async function ensureTabsExist(spreadsheetId: string, tabNames: string[]) {
  if (tabNames.length === 0) return;
  await ensureSpreadsheetTabs({ spreadsheetId, tabNames });
}

export async function readManySheetValues(
  spreadsheetId: string,
  tabNames: string[],
): Promise<Record<string, string[][]>> {
  const result: Record<string, string[][]> = {};
  if (tabNames.length === 0) return result;

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabNames.map((tabName) => `${tabName}!A:ZZ`),
  });

  (response.data.valueRanges ?? []).forEach((range, index) => {
    const tabName = tabNames[index];
    if (!tabName) return;
    result[tabName] = (range.values ?? []).map((row) =>
      row.map((value) => String(value)),
    );
  });

  return result;
}

export async function clearAndWriteManySheets(
  spreadsheetId: string,
  tabs: Array<{ tabName: string; rows: string[][] }>,
  valueInputOption: "RAW" | "USER_ENTERED" = "RAW",
) {
  if (tabs.length === 0) return;

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: { ranges: tabs.map((tab) => `${tab.tabName}!A:ZZ`) },
  });

  // Large tabs are written in 5,000-row blocks, 4 blocks per request, so a
  // tab holding months of history never exceeds the API's request size.
  const BLOCK = 5_000;
  const data = tabs.flatMap((tab) => {
    const blocks: Array<{ range: string; values: string[][] }> = [];
    for (let start = 0; start < tab.rows.length; start += BLOCK) {
      blocks.push({ range: `${tab.tabName}!A${start + 1}`, values: tab.rows.slice(start, start + BLOCK) });
    }
    return blocks;
  });

  for (let i = 0; i < data.length; i += 4) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption, data: data.slice(i, i + 4) },
    });
  }
}

/** Cells allocated across all tabs; Google caps a spreadsheet at 10,000,000. */
export async function countSpreadsheetCells(spreadsheetId: string): Promise<number> {
  const spreadsheet = await getSpreadsheet(spreadsheetId);
  return (spreadsheet.sheets ?? []).reduce((total, sheet) => {
    const grid = sheet.properties?.gridProperties;
    return total + (grid?.rowCount ?? 0) * (grid?.columnCount ?? 0);
  }, 0);
}

/** Creates a new spreadsheet in the writer's Drive and returns its id and URL. */
export async function createSpreadsheet(title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.create({ requestBody: { properties: { title } } });
  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) throw new Error("Google did not return an id for the new spreadsheet.");
  return {
    spreadsheetId,
    spreadsheetUrl: response.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
