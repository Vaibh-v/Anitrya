import type { TrendPoint } from "@/lib/evidence/types";

function toUtcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getUtcDaysBack(days: number) {
  const now = new Date();
  const utc = toUtcDateOnly(now);
  utc.setUTCDate(utc.getUTCDate() - days);
  return utc;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function last14DaysRange() {
  return {
    from: getUtcDaysBack(13),
    to: toUtcDateOnly(new Date())
  };
}

export function splitIntoPrevious7AndCurrent7<T extends { date: Date }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const previous7 = sorted.slice(0, 7);
  const current7 = sorted.slice(7, 14);

  return { previous7, current7 };
}

export function fillSeries(
  rows: Array<{ date: Date; value: number }>,
  from: Date,
  days: number
): TrendPoint[] {
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    map.set(key, row.value);
  }

  const points: TrendPoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(from);
    date.setUTCDate(from.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);

    points.push({
      label: formatShortDate(date),
      value: map.get(key) ?? 0
    });
  }

  return points;
}