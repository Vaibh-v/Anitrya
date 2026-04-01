type GscKeywordApiRow = {
  keys?: string[];
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

type Ga4ReportRow = {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
};

function numberOrZero(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function normalizeGscQueryRows(input: {
  workspaceId: string;
  siteId: string;
  date: Date;
  rows: GscKeywordApiRow[];
}) {
  return input.rows
    .map((row) => {
      const query = row.keys?.[0]?.trim() ?? "";
      const page = row.keys?.[1]?.trim() ?? "";

      if (!query || !page) {
        return null;
      }

      return {
        workspaceId: input.workspaceId,
        siteId: input.siteId,
        date: input.date,
        query,
        page,
        clicks: numberOrZero(row.clicks),
        impressions: numberOrZero(row.impressions),
        ctr: numberOrZero(row.ctr),
        position: numberOrZero(row.position),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function collapseGscPageRows(input: {
  workspaceId: string;
  siteId: string;
  date: Date;
  rows: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}) {
  const grouped = new Map<
    string,
    { page: string; clicks: number; impressions: number; weightedPosition: number }
  >();

  for (const row of input.rows) {
    const existing = grouped.get(row.page) ?? {
      page: row.page,
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
    };

    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.weightedPosition += row.position * Math.max(row.impressions, 1);

    grouped.set(row.page, existing);
  }

  return Array.from(grouped.values()).map((row) => ({
    workspaceId: input.workspaceId,
    siteId: input.siteId,
    date: input.date,
    page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
    position: row.impressions > 0 ? row.weightedPosition / row.impressions : 0,
  }));
}

export function normalizeGa4LandingRows(input: {
  workspaceId: string;
  propertyId: string;
  date: Date;
  rows: Ga4ReportRow[];
}) {
  return input.rows
    .map((row) => {
      const page = row.dimensionValues?.[0]?.value?.trim() ?? "";

      if (!page) {
        return null;
      }

      return {
        workspaceId: input.workspaceId,
        propertyId: input.propertyId,
        date: input.date,
        page,
        sessions: numberOrZero(row.metricValues?.[0]?.value),
        users: numberOrZero(row.metricValues?.[1]?.value),
        conversions: numberOrZero(row.metricValues?.[2]?.value),
        engagementRate: row.metricValues?.[3]?.value == null
          ? null
          : numberOrZero(row.metricValues[3].value),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function normalizeGa4SourceRows(input: {
  workspaceId: string;
  propertyId: string;
  date: Date;
  rows: Ga4ReportRow[];
}) {
  return input.rows
    .map((row) => {
      const sourceMedium = row.dimensionValues?.[0]?.value?.trim() ?? "";

      if (!sourceMedium) {
        return null;
      }

      return {
        workspaceId: input.workspaceId,
        propertyId: input.propertyId,
        date: input.date,
        sourceMedium,
        sessions: numberOrZero(row.metricValues?.[0]?.value),
        users: numberOrZero(row.metricValues?.[1]?.value),
        conversions: numberOrZero(row.metricValues?.[2]?.value),
        engagementRate: row.metricValues?.[3]?.value == null
          ? null
          : numberOrZero(row.metricValues[3].value),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}