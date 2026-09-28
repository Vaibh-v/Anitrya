/**
 * GA4 audience geography: sessions, users and key events per day by country,
 * region and city. Feeds the Overview globe and the "where customers are"
 * panels. Small (days × cities) and replaced per window like the other GA4 tables.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";

type Input = { workspaceId: string; projectSlug: string; propertyId: string; accessToken: string; from: string; to: string };
type Ga4Row = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };

const esc = (value: string) => value.replace(/'/g, "''");

export async function fetchGA4GeoDaily(input: Input): Promise<number> {
  await ensureAdditiveSchema();
  const propertyId = input.propertyId.trim().replace(/^properties\//, "");
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: input.from, endDate: input.to }],
      dimensions: [{ name: "date" }, { name: "countryId" }, { name: "country" }, { name: "region" }, { name: "city" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "keyEvents" }],
      limit: 100000,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { rows?: Ga4Row[]; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `GA4 geography sync failed for property ${propertyId}.`);

  const values = (payload.rows ?? [])
    .map((row) => {
      const d = row.dimensionValues ?? [];
      const raw = d[0]?.value ?? "";
      const date = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : "";
      if (!date) return null;
      const m = (i: number) => Math.round(Number(row.metricValues?.[i]?.value ?? "0")) || 0;
      const text = (i: number) => esc((d[i]?.value ?? "").slice(0, 120));
      return `('${esc(input.workspaceId)}','${esc(input.projectSlug)}',DATE '${date}','${text(1)}','${text(2)}','${text(3)}','${text(4)}',${m(0)},${m(1)},${m(2)})`;
    })
    .filter((v): v is string => Boolean(v));

  await prisma.$executeRawUnsafe(
    `DELETE FROM ga4_geo_daily WHERE workspace_id = $1 AND project_slug = $2 AND date >= $3::date AND date <= $4::date`,
    input.workspaceId,
    input.projectSlug,
    input.from,
    input.to,
  );
  for (let offset = 0; offset < values.length; offset += 2000) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ga4_geo_daily (workspace_id, project_slug, date, country_id, country, region, city, sessions, users, key_events)
       VALUES ${values.slice(offset, offset + 2000).join(",")}`,
    );
  }
  return values.length;
}

export type GeoMarket = { id: string; name: string; sessions: number; users: number; keyEvents: number };
export type GeoSummary = { countries: GeoMarket[]; regions: GeoMarket[]; cities: GeoMarket[]; totalSessions: number };

/** Aggregated geography for a window; empty lists when nothing is synced yet. */
export async function getGeoSummary(input: { workspaceId: string; projectSlug: string; from: string; to: string }): Promise<GeoSummary> {
  await ensureAdditiveSchema();
  const where = `workspace_id = $1 AND project_slug = $2 AND date >= $3::date AND date <= $4::date`;
  const params = [input.workspaceId, input.projectSlug, input.from, input.to];
  const n = (v: unknown) => Number(v ?? 0) || 0;
  const q = (select: string, group: string, limit: number) =>
    prisma
      .$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT ${select}, SUM(sessions) AS s, SUM(users) AS u, SUM(key_events) AS k FROM ga4_geo_daily
         WHERE ${where} GROUP BY ${group} ORDER BY s DESC NULLS LAST LIMIT ${limit}`,
        ...params,
      )
      .catch(() => []);
  const [countries, regions, cities] = await Promise.all([
    q(`country_id AS id, MAX(country) AS name`, `country_id`, 60),
    q(`country_id || '|' || region AS id, MAX(region) AS name`, `country_id, region`, 60),
    q(`country_id || '|' || region || '|' || city AS id, MAX(city) AS name`, `country_id, region, city`, 40),
  ]);
  const map = (rows: Array<Record<string, unknown>>) =>
    rows
      .filter((r) => r.name && r.name !== "(not set)")
      .map((r) => ({ id: String(r.id), name: String(r.name), sessions: n(r.s), users: n(r.u), keyEvents: n(r.k) }));
  const c = map(countries);
  return { countries: c, regions: map(regions), cities: map(cities), totalSessions: c.reduce((sum, x) => sum + x.sessions, 0) };
}
