import { google, sheets_v4 } from "googleapis";

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

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const auth = getSheetsJwt();
  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
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

export async function ensureSheetStructure(
  spreadsheetId: string,
  schema: Record<string, string[]>,
) {
  const tabNames = Object.keys(schema);
  await ensureSpreadsheetTabs({ spreadsheetId, tabNames });

  for (const tabName of tabNames) {
    const expectedHeader = schema[tabName];
    const existing = await readSheetValues(spreadsheetId, tabName);

    if (existing.length === 0) {
      await clearAndWriteSheet(spreadsheetId, tabName, [expectedHeader]);
      continue;
    }

    const header = existing[0] ?? [];
    const sameHeader =
      header.length === expectedHeader.length &&
      header.every((value, index) => value === expectedHeader[index]);

    if (!sameHeader) {
      const bodyRows = existing.slice(1);
      await clearAndWriteSheet(spreadsheetId, tabName, [
        expectedHeader,
        ...bodyRows,
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

  const data = tabs
    .filter((tab) => tab.rows.length > 0)
    .map((tab) => ({ range: `${tab.tabName}!A1`, values: tab.rows }));

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption, data },
  });
}
