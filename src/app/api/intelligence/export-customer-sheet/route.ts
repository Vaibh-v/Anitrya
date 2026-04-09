import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleSheetsAccessTokenForWorkspace } from "@/lib/integrations/google/get-google-access-token";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? trimmed;
}

type CellValue = string | number;

async function queryRows(
  sql: string,
  params: unknown[],
): Promise<CellValue[][]> {
  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as Record<
    string,
    unknown
  >[];

  return rows.map((row) =>
    Object.values(row).map((value) => {
      if (value == null) return "";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (typeof value === "number" || typeof value === "string") return value;
      return String(value);
    }),
  );
}

async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string,
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

  const titles =
    spreadsheet.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((value): value is string => Boolean(value)) ?? [];

  if (!titles.includes(title)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });
  } else {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${title}!A:Z`,
    });
  }
}

async function writeSheetValues(args: {
  sheets: ReturnType<typeof google.sheets>;
  spreadsheetId: string;
  title: string;
  header: string[];
  rows: CellValue[][];
}) {
  const { sheets, spreadsheetId, title, header, rows } = args;

  await ensureSheet(sheets, spreadsheetId, title);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [header, ...rows],
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);

    const projectRef = asString(body?.project);
    const spreadsheetInput = asString(body?.spreadsheetId);
    const from = asString(body?.from);
    const to = asString(body?.to);

    if (!projectRef || !spreadsheetInput || !from || !to) {
      return NextResponse.json(
        { error: "project, spreadsheetId, from, and to are required." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectRef }, { slug: projectRef }, { name: projectRef }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        workspaceId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    const accessToken = await getGoogleSheetsAccessTokenForWorkspace(
      project.workspaceId,
    );

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);

    const workspaceRows: CellValue[][] = [
      [project.workspaceId, project.id, project.slug, project.name, from, to],
    ];

    const ga4SourceRows = await queryRows(
      `
      SELECT
        date::text AS date,
        source,
        COALESCE(sessions, 0) AS sessions
      FROM ga4_source_daily
      WHERE workspace_id = $1
        AND project_slug = $2
        AND date >= CAST($3 AS DATE)
        AND date <= CAST($4 AS DATE)
      ORDER BY date ASC, source ASC
      `,
      [project.workspaceId, project.slug, from, to],
    );

    const ga4LandingRows = await queryRows(
      `
      SELECT
        date::text AS date,
        landing_page,
        COALESCE(sessions, 0) AS sessions
      FROM ga4_landing_page_daily
      WHERE workspace_id = $1
        AND project_slug = $2
        AND date >= CAST($3 AS DATE)
        AND date <= CAST($4 AS DATE)
      ORDER BY date ASC, landing_page ASC
      `,
      [project.workspaceId, project.slug, from, to],
    );

    const gscQueryRows = await queryRows(
      `
      SELECT
        date::text AS date,
        query,
        COALESCE(clicks, 0) AS clicks,
        COALESCE(impressions, 0) AS impressions,
        COALESCE(ctr, 0) AS ctr,
        COALESCE(position, 0) AS position
      FROM gsc_query_daily
      WHERE workspace_id = $1
        AND project_slug = $2
        AND date >= CAST($3 AS DATE)
        AND date <= CAST($4 AS DATE)
      ORDER BY date ASC, query ASC
      `,
      [project.workspaceId, project.slug, from, to],
    );

    const gscPageRows = await queryRows(
      `
      SELECT
        date::text AS date,
        page,
        COALESCE(clicks, 0) AS clicks,
        COALESCE(impressions, 0) AS impressions,
        COALESCE(ctr, 0) AS ctr,
        COALESCE(position, 0) AS position
      FROM gsc_page_daily
      WHERE workspace_id = $1
        AND project_slug = $2
        AND date >= CAST($3 AS DATE)
        AND date <= CAST($4 AS DATE)
      ORDER BY date ASC, page ASC
      `,
      [project.workspaceId, project.slug, from, to],
    );

    await writeSheetValues({
      sheets,
      spreadsheetId,
      title: "workspace",
      header: [
        "workspace_id",
        "project_id",
        "project_slug",
        "project_label",
        "from",
        "to",
      ],
      rows: workspaceRows,
    });

    await writeSheetValues({
      sheets,
      spreadsheetId,
      title: "ga4_source_daily",
      header: ["date", "source", "sessions"],
      rows: ga4SourceRows,
    });

    await writeSheetValues({
      sheets,
      spreadsheetId,
      title: "ga4_landing_page_daily",
      header: ["date", "landing_page", "sessions"],
      rows: ga4LandingRows,
    });

    await writeSheetValues({
      sheets,
      spreadsheetId,
      title: "gsc_query_daily",
      header: ["date", "query", "clicks", "impressions", "ctr", "position"],
      rows: gscQueryRows,
    });

    await writeSheetValues({
      sheets,
      spreadsheetId,
      title: "gsc_page_daily",
      header: ["date", "page", "clicks", "impressions", "ctr", "position"],
      rows: gscPageRows,
    });

    return NextResponse.json({
      ok: true,
      message: "Customer sheet export completed successfully.",
      spreadsheetId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Customer sheet export failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}