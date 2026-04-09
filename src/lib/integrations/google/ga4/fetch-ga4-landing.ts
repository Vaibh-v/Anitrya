import { prisma } from "@/lib/prisma";

type Input = {
  workspaceId: string;
  projectSlug: string;
  propertyId: string;
  accessToken: string;
  from: string;
  to: string;
};

type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizePropertyId(propertyId: string): string {
  return propertyId.replace(/^properties\//, "").trim();
}

function normalizeGaDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export async function fetchGA4LandingPageDaily(input: Input): Promise<number> {
  const propertyId = normalizePropertyId(input.propertyId);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: input.from, endDate: input.to }],
        dimensions: [{ name: "date" }, { name: "landingPage" }],
        metrics: [{ name: "sessions" }],
        limit: 10000,
      }),
    },
  );

  const payload = (await response.json()) as {
    rows?: Ga4Row[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "GA4 landing-page sync failed.");
  }

  const rows = payload.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM ga4_landing_page_daily
    WHERE workspace_id = '${input.workspaceId.replace(/'/g, "''")}'
      AND project_slug = '${input.projectSlug.replace(/'/g, "''")}'
      AND date >= DATE '${input.from.replace(/'/g, "''")}'
      AND date <= DATE '${input.to.replace(/'/g, "''")}'
  `);

  for (const row of rows) {
    const date = normalizeGaDate(row.dimensionValues?.[0]?.value ?? "");
    const landingPage = row.dimensionValues?.[1]?.value ?? "(not set)";
    const sessions = Number(row.metricValues?.[0]?.value ?? "0");

    if (!date) continue;

    await prisma.$executeRawUnsafe(`
      INSERT INTO ga4_landing_page_daily (
        workspace_id,
        project_slug,
        date,
        landing_page,
        page_path,
        sessions
      )
      VALUES (
        '${input.workspaceId.replace(/'/g, "''")}',
        '${input.projectSlug.replace(/'/g, "''")}',
        DATE '${date.replace(/'/g, "''")}',
        '${landingPage.replace(/'/g, "''")}',
        '${landingPage.replace(/'/g, "''")}',
        ${Number.isFinite(sessions) ? sessions : 0}
      )
    `);
  }

  return rows.length;
}