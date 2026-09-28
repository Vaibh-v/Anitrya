/**
 * Search Console history by month (top queries per calendar month, up to the
 * 16 months Google keeps). This is the seasonal memory: what people searched
 * for last October tells us what to prepare for this October. Complete months
 * are fetched once; the current and previous month are refreshed. A few
 * months per sync keeps each run inside the serverless budget.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";

type Input = { workspaceId: string; projectSlug: string; siteUrl: string; accessToken: string; maxMonths?: number };

/** Calendar months from 16 months ago to this month, as {key, from, to}. */
export function historyMonths(today = new Date()) {
  const months: Array<{ key: string; from: string; to: string }> = [];
  for (let back = 15; back >= 0; back--) {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const to = end > today ? today : end;
    months.push({ key: start.toISOString().slice(0, 7), from: start.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  }
  // The oldest month is only partly inside Google's 16-month window.
  const floor = new Date(today);
  floor.setUTCMonth(floor.getUTCMonth() - 16);
  floor.setUTCDate(floor.getUTCDate() + 3);
  const floorIso = floor.toISOString().slice(0, 10);
  return months.map((m) => (m.from < floorIso ? { ...m, from: floorIso } : m)).filter((m) => m.from <= m.to);
}

export async function syncGscMonthly(input: Input): Promise<number> {
  await ensureAdditiveSchema();
  const months = historyMonths();
  const have = new Set(
    (
      await prisma.$queryRawUnsafe<Array<{ month: string }>>(
        `SELECT DISTINCT month FROM gsc_query_monthly WHERE workspace_id = $1 AND project_slug = $2`,
        input.workspaceId,
        input.projectSlug,
      )
    ).map((r) => r.month),
  );
  const recent = new Set(months.slice(-2).map((m) => m.key));
  // Newest first, so seasonal comparisons (same month last year, next month last year) fill early.
  const todo = months.filter((m) => !have.has(m.key) || recent.has(m.key)).reverse().slice(0, input.maxMonths ?? 6);

  let rows = 0;
  for (const month of todo) {
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: month.from, endDate: month.to, dimensions: ["query"], rowLimit: 5000 }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; position?: number }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `Search Console monthly history failed for ${month.key}.`);
    const values = (payload.rows ?? [])
      .filter((r) => r.keys?.[0])
      .map((r) => [r.keys![0].slice(0, 300), Math.round(r.clicks ?? 0), Math.round(r.impressions ?? 0), Number((r.position ?? 0).toFixed(2))] as const);
    await prisma.$executeRawUnsafe(
      `DELETE FROM gsc_query_monthly WHERE workspace_id = $1 AND project_slug = $2 AND month = $3`,
      input.workspaceId,
      input.projectSlug,
      month.key,
    );
    for (let offset = 0; offset < values.length; offset += 1000) {
      const chunk = values.slice(offset, offset + 1000);
      const params: unknown[] = [input.workspaceId, input.projectSlug, month.key];
      const tuples = chunk.map((v, i) => {
        params.push(...v);
        const b = 4 + i * 4;
        return `($1, $2, $3, $${b}, $${b + 1}, $${b + 2}, $${b + 3})`;
      });
      await prisma.$executeRawUnsafe(
        `INSERT INTO gsc_query_monthly (workspace_id, project_slug, month, query, clicks, impressions, position) VALUES ${tuples.join(",")}`,
        ...params,
      );
    }
    rows += values.length;
  }
  return rows;
}
