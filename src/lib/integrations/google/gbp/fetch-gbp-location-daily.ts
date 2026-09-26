import { prisma } from "@/lib/prisma";
import { ensureNormalizedEvidenceTables } from "@/lib/evidence/ensure-normalized-evidence-tables";
import { buildGbpPerformanceUrl } from "@/lib/integrations/google/gbp/performance-request";
import { assertIsoDateRange, readGoogleJson } from "@/lib/integrations/google/read-google-json";

export const GBP_LOCATION_DAILY_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_CONVERSATIONS",
  "BUSINESS_DIRECTION_REQUESTS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_BOOKINGS",
  "BUSINESS_FOOD_ORDERS",
  "BUSINESS_FOOD_MENU_CLICKS",
] as const;

type Input = {
  workspaceId: string;
  projectSlug: string;
  locationName: string;
  locationLabel: string | null;
  accountName: string | null;
  accessToken: string;
  from: string;
  to: string;
};

type GbpDate = {
  year?: number | string;
  month?: number | string;
  day?: number | string;
};

type GbpDatedValue = {
  date?: GbpDate;
  value?: string | number | null;
};

type GbpTimeSeries = {
  datedValues?: GbpDatedValue[];
  dated_values?: GbpDatedValue[];
};

type GbpDailyMetricTimeSeries = {
  dailyMetric?: string;
  daily_metric?: string;
  timeSeries?: GbpTimeSeries;
  time_series?: GbpTimeSeries;
};

type GbpMetricGroup = {
  dailyMetricTimeSeries?: GbpDailyMetricTimeSeries | GbpDailyMetricTimeSeries[];
  daily_metric_time_series?:
    | GbpDailyMetricTimeSeries
    | GbpDailyMetricTimeSeries[];
};

type GbpPerformanceResponse = {
  multiDailyMetricTimeSeries?: GbpMetricGroup[];
  multi_daily_metric_time_series?: GbpMetricGroup[];
  error?: {
    message?: string;
  };
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeLocationName(value: string): string {
  const cleaned = value.trim();
  return cleaned.startsWith("locations/") ? cleaned : `locations/${cleaned}`;
}

function formatGbpDate(value: GbpDate | undefined): string | null {
  if (!value?.year || !value.month || !value.day) return null;

  const year = String(value.year).padStart(4, "0");
  const month = String(value.month).padStart(2, "0");
  const day = String(value.day).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function metricGroups(payload: GbpPerformanceResponse): GbpMetricGroup[] {
  return (
    payload.multiDailyMetricTimeSeries ??
    payload.multi_daily_metric_time_series ??
    []
  );
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function seriesForGroup(group: GbpMetricGroup): GbpDailyMetricTimeSeries[] {
  return asArray(group.dailyMetricTimeSeries ?? group.daily_metric_time_series);
}

function valuesForSeries(series: GbpDailyMetricTimeSeries): GbpDatedValue[] {
  const timeSeries = series.timeSeries ?? series.time_series;
  return timeSeries?.datedValues ?? timeSeries?.dated_values ?? [];
}

export async function fetchGbpLocationDaily(rawInput: Input): Promise<number> {
  assertIsoDateRange(rawInput.from, rawInput.to, "Google Business Profile sync");

  // The Performance API only has data up to (roughly) yesterday; never ask for
  // or delete rows beyond today, so an end date in the future cannot wipe or
  // misreport existing evidence.
  const today = new Date().toISOString().slice(0, 10);
  const input = { ...rawInput, to: rawInput.to > today ? today : rawInput.to };
  if (input.from > input.to) return 0;

  const locationName = normalizeLocationName(input.locationName);
  const response = await fetch(
    buildGbpPerformanceUrl({
      locationName,
      from: input.from,
      to: input.to,
      metrics: GBP_LOCATION_DAILY_METRICS,
    }),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  const payload = await readGoogleJson<GbpPerformanceResponse>(
    response,
    "Google Business Profile performance sync",
  );

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `Google Business Profile performance sync failed for ${locationName}.`,
    );
  }

  await ensureNormalizedEvidenceTables();

  const normalizedRows = metricGroups(payload)
    .flatMap(seriesForGroup)
    .flatMap((series) => {
      const metric = series.dailyMetric ?? series.daily_metric ?? "";

      return valuesForSeries(series).map((datedValue) => {
        const date = formatGbpDate(datedValue.date);
        const value = Number(datedValue.value ?? 0);

        if (!metric || !date) return null;

        return `(
          '${escapeSql(input.workspaceId)}',
          '${escapeSql(input.projectSlug)}',
          DATE '${escapeSql(date)}',
          '${escapeSql(locationName)}',
          '${escapeSql(input.locationLabel ?? "")}',
          '${escapeSql(input.accountName ?? "")}',
          '${escapeSql(metric)}',
          ${Number.isFinite(value) ? value : 0}
        )`;
      });
    })
    .filter((value): value is string => Boolean(value));

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(`
      DELETE FROM gbp_location_daily
      WHERE workspace_id = '${escapeSql(input.workspaceId)}'
        AND project_slug = '${escapeSql(input.projectSlug)}'
        AND location_name = '${escapeSql(locationName)}'
        AND date >= DATE '${escapeSql(input.from)}'
        AND date <= DATE '${escapeSql(input.to)}'
    `);

    if (normalizedRows.length > 0) {
      await transaction.$executeRawUnsafe(`
      INSERT INTO gbp_location_daily (
        workspace_id,
        project_slug,
        date,
        location_name,
        location_label,
        account_name,
        metric,
        value
      )
      VALUES ${normalizedRows.join(",\n")}
    `);
    }
  }, { timeout: 30_000, maxWait: 10_000 });

  return normalizedRows.length;
}
