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
  const cleaned = propertyId.trim();
  return cleaned.startsWith("properties/")
    ? cleaned.replace(/^properties\//, "")
    : cleaned;
}

function normalizeGaDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export async function fetchGA4SourceDaily(input: Input): Promise<number> {
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
        dimensions: [{ name: "date" }, { name: "sessionSource" }],
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
    throw new Error(
      payload.error?.message ??
        `GA4 source sync failed for property ${propertyId}.`,
    );
  }

  const rows = payload.rows ?? [];

  await prisma.$executeRawUnsafe(`
    DELETE FROM ga4_source_daily
    WHERE workspace_id = '${escapeSql(input.workspaceId)}'
      AND project_slug = '${escapeSql(input.projectSlug)}'
      AND date >= DATE '${escapeSql(input.from)}'
      AND date <= DATE '${escapeSql(input.to)}'
  `);

  const normalizedRows = rows
    .map((row) => {
      const date = normalizeGaDate(row.dimensionValues?.[0]?.value ?? "");
      const source = row.dimensionValues?.[1]?.value ?? "(not set)";
      const sessions = Number(row.metricValues?.[0]?.value ?? "0");

      if (!date) return null;

      return `(
        '${escapeSql(input.workspaceId)}',
        '${escapeSql(input.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(source)}',
        ${Number.isFinite(sessions) ? sessions : 0}
      )`;
    })
    .filter((value): value is string => Boolean(value));

  if (normalizedRows.length > 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO ga4_source_daily (
        workspace_id,
        project_slug,
        date,
        source,
        sessions
      )
      VALUES ${normalizedRows.join(",\n")}
    `);
  }

  return normalizedRows.length;
}