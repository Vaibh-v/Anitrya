import { google, sheets_v4 } from "googleapis";
import { prisma } from "@/lib/prisma";

type Dataset = {
  title: string;
  rows: string[][];
};

function toSheetTitle(input: string): string {
  return input.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 80) || "Sheet";
}

export function parseSpreadsheetId(input: string): string {
  const value = input.trim();

  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) {
    return match[1];
  }

  return value;
}

async function getColumnNames(tableName: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;

  return rows.map((row) => row.column_name);
}

async function getExistingTables(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `;

  return new Set(rows.map((row) => row.table_name));
}

function pickColumns(
  available: string[],
  preferred: string[]
): string[] {
  return preferred.filter((column) => available.includes(column));
}

async function readTableDataset(input: {
  tableName: string;
  title: string;
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  preferredColumns: string[];
  limit?: number;
}): Promise<Dataset | null> {
  const tables = await getExistingTables();

  if (!tables.has(input.tableName)) {
    return null;
  }

  const availableColumns = await getColumnNames(input.tableName);
  const selectedColumns = pickColumns(availableColumns, input.preferredColumns);

  if (selectedColumns.length === 0) {
    return null;
  }

  const hasWorkspaceId = availableColumns.includes("workspace_id");
  const hasProjectSlug = availableColumns.includes("project_slug");
  const hasDate = availableColumns.includes("date");

  const whereParts: string[] = [];
  const values: Array<string | number> = [];
  let paramIndex = 1;

  if (hasWorkspaceId) {
    whereParts.push(`workspace_id = $${paramIndex++}`);
    values.push(input.workspaceId);
  }

  if (hasProjectSlug) {
    whereParts.push(`project_slug = $${paramIndex++}`);
    values.push(input.projectSlug);
  }

  if (hasDate) {
    whereParts.push(`date >= $${paramIndex++}`);
    values.push(input.from);
    whereParts.push(`date <= $${paramIndex++}`);
    values.push(input.to);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const orderClause = hasDate ? `ORDER BY date DESC` : "";
  const limitClause = `LIMIT ${input.limit ?? 200}`;

  const sql = `
    SELECT ${selectedColumns.map((column) => `"${column}"`).join(", ")}
    FROM "${input.tableName}"
    ${whereClause}
    ${orderClause}
    ${limitClause}
  `;

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    sql,
    ...values
  );

  return {
    title: input.title,
    rows: [
      selectedColumns,
      ...rows.map((row) =>
        selectedColumns.map((column) => {
          const value = row[column];
          return value == null ? "" : String(value);
        })
      ),
    ],
  };
}

async function ensureSheets(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  titles: string[]
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    (spreadsheet.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((value): value is string => Boolean(value))
  );

  const requests = titles
    .filter((title) => !existing.has(title))
    .map((title) => ({
      addSheet: {
        properties: {
          title,
        },
      },
    }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

async function clearAndWriteSheet(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  title: string;
  rows: string[][];
}) {
  const range = `${toSheetTitle(input.title)}!A:ZZ`;

  await input.sheets.spreadsheets.values.clear({
    spreadsheetId: input.spreadsheetId,
    range,
  });

  await input.sheets.spreadsheets.values.update({
    spreadsheetId: input.spreadsheetId,
    range: `${toSheetTitle(input.title)}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: input.rows,
    },
  });
}

export async function exportCustomerSheet(input: {
  accessToken: string;
  spreadsheetIdOrUrl: string;
  workspaceId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
}) {
  const spreadsheetId = parseSpreadsheetId(input.spreadsheetIdOrUrl);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: input.accessToken });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const datasets: Dataset[] = [];

  datasets.push({
    title: "workspace",
    rows: [
      ["workspace_id", "project_slug", "project_label", "from", "to"],
      [
        input.workspaceId,
        input.projectSlug,
        input.projectLabel,
        input.from,
        input.to,
      ],
    ],
  });

  const dynamicDatasets = await Promise.all([
    readTableDataset({
      tableName: "ga4_source_daily",
      title: "ga4_source_daily",
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      from: input.from,
      to: input.to,
      preferredColumns: [
        "date",
        "source",
        "medium",
        "sessions",
        "users",
        "engaged_sessions",
        "conversions",
      ],
    }),
    readTableDataset({
      tableName: "ga4_landing_page_daily",
      title: "ga4_landing_page_daily",
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      from: input.from,
      to: input.to,
      preferredColumns: [
        "date",
        "landing_page",
        "page_path",
        "sessions",
        "users",
        "engaged_sessions",
        "conversions",
      ],
    }),
    readTableDataset({
      tableName: "gsc_query_daily",
      title: "gsc_query_daily",
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      from: input.from,
      to: input.to,
      preferredColumns: [
        "date",
        "query",
        "clicks",
        "impressions",
        "ctr",
        "position",
      ],
    }),
    readTableDataset({
      tableName: "gsc_page_daily",
      title: "gsc_page_daily",
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      from: input.from,
      to: input.to,
      preferredColumns: [
        "date",
        "page",
        "page_path",
        "clicks",
        "impressions",
        "ctr",
        "position",
      ],
    }),
  ]);

  for (const dataset of dynamicDatasets) {
    if (dataset) {
      datasets.push(dataset);
    }
  }

  await ensureSheets(
    sheets,
    spreadsheetId,
    datasets.map((dataset) => toSheetTitle(dataset.title))
  );

  await Promise.all(
    datasets.map((dataset) =>
      clearAndWriteSheet({
        sheets,
        spreadsheetId,
        title: dataset.title,
        rows: dataset.rows,
      })
    )
  );

  return {
    spreadsheetId,
    tabsWritten: datasets.map((dataset) => dataset.title),
  };
}