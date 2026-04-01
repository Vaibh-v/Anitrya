import { GSCQueryRow, GSCPageRow, GA4LandingRow } from "./types";

/**
 * Build query-level aggregation
 */
export function buildGSCQueryRows(rows: any[]): GSCQueryRow[] {
  if (!rows?.length) return [];

  return rows
    .map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
    .filter((r) => r.query)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);
}

/**
 * Build page-level aggregation
 */
export function buildGSCPageRows(rows: any[]): GSCPageRow[] {
  if (!rows?.length) return [];

  const map = new Map<string, GSCPageRow>();

  for (const r of rows) {
    const page = r.keys?.[1];
    if (!page) continue;

    const existing = map.get(page) || {
      page,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    existing.clicks += r.clicks ?? 0;
    existing.impressions += r.impressions ?? 0;

    map.set(page, existing);
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      ctr: r.impressions ? r.clicks / r.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);
}

/**
 * Build GA4 landing page rows
 */
export function buildGA4LandingRows(rows: any[]): GA4LandingRow[] {
  if (!rows?.length) return [];

  return rows
    .map((r) => ({
      page: r.dimensionValues?.[0]?.value ?? "",
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
      conversions: Number(r.metricValues?.[2]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[3]?.value ?? 0) || null,
    }))
    .filter((r) => r.page)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 50);
}