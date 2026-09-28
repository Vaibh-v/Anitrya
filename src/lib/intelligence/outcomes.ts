/**
 * Learning from outcomes. When a customer marks a finding as done, Anitrya
 * records the metric it should move (for the same queries, pages or sources
 * where possible) over the 28 days before. Four weeks later the nightly job
 * measures the same thing again. The lift feeds back into the AI panel: models
 * whose advice on that kind of finding worked get more weight next time.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import type { IntelligenceInsight } from "@/lib/intelligence/contracts";

const WINDOW_DAYS = 28;
const DAY = 86400_000;

import { outcomeTarget, outcomeKey, trustWeight, type Target } from "@/lib/intelligence/outcomes-core";
export { outcomeTarget, outcomeKey, trustWeight };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Sum of the metric over [from, to], for the finding's rows when they match stored labels. */
async function measure(workspaceId: string, projectSlug: string, target: Target, labels: string[], from: Date, to: Date) {
  const base = `FROM ${target.table} WHERE workspace_id = $1 AND project_slug = $2 AND CAST(date AS TEXT) >= $3 AND CAST(date AS TEXT) <= $4`;
  const params: unknown[] = [workspaceId, projectSlug, iso(from), iso(to)];
  const clean = labels.map((l) => l.replace(/ \(home market\)$/, "")).filter(Boolean);
  if (target.labelExpr && clean.length) {
    const rows = await prisma.$queryRawUnsafe<Array<{ v: number | null }>>(
      `SELECT SUM(${target.metric})::float AS v ${base} AND ${target.labelExpr} = ANY($5::text[])`,
      ...params,
      clean,
    );
    const v = Number(rows[0]?.v ?? 0);
    if (v > 0) return { value: v, scoped: true };
  }
  const rows = await prisma.$queryRawUnsafe<Array<{ v: number | null }>>(`SELECT SUM(${target.metric})::float AS v ${base}`, ...params);
  return { value: Number(rows[0]?.v ?? 0), scoped: false };
}

export async function markDone(input: { workspaceId: string; projectSlug: string; insight: IntelligenceInsight; providers: string[]; email: string }) {
  await ensureAdditiveSchema();
  const target = outcomeTarget(input.insight);
  const labels = (input.insight.rows ?? []).map((r) => r.label).slice(0, 12);
  const now = new Date();
  const baseline = await measure(input.workspaceId, input.projectSlug, target, labels, new Date(now.getTime() - (WINDOW_DAYS - 1) * DAY), now);
  const measureAfter = new Date(now.getTime() + WINDOW_DAYS * DAY);
  await prisma.$executeRawUnsafe(
    `INSERT INTO recommendation_outcome (workspace_id, project_slug, insight_key, category, title, metric, baseline, measure_after, providers, marked_by, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CAST($9 AS JSONB), $10, CAST($11 AS JSONB))
     ON CONFLICT (workspace_id, project_slug, insight_key) DO UPDATE SET marked_at = CURRENT_TIMESTAMP, title = EXCLUDED.title, baseline = EXCLUDED.baseline,
       measure_after = EXCLUDED.measure_after, measured_at = NULL, result = NULL, lift = NULL, providers = EXCLUDED.providers,
       marked_by = EXCLUDED.marked_by, detail = EXCLUDED.detail`,
    input.workspaceId,
    input.projectSlug,
    outcomeKey(input.insight),
    input.insight.category,
    input.insight.title,
    target.metric,
    baseline.value,
    measureAfter,
    JSON.stringify(input.providers),
    input.email,
    JSON.stringify({ labels, table: target.table, scoped: baseline.scoped, lowerIsBetter: target.lowerIsBetter }),
  );
  return { metric: target.metric, baseline: baseline.value, measureAfter: measureAfter.toISOString() };
}

export type OutcomeRow = { insight_key: string; metric: string; baseline: number; marked_at: Date; measure_after: Date; measured_at: Date | null; result: number | null; lift: number | null };

export async function outcomesFor(workspaceId: string, projectSlug: string): Promise<Record<string, OutcomeRow>> {
  await ensureAdditiveSchema();
  const rows = await prisma
    .$queryRawUnsafe<OutcomeRow[]>(
      `SELECT insight_key, metric, baseline, marked_at, measure_after, measured_at, result, lift FROM recommendation_outcome WHERE workspace_id = $1 AND project_slug = $2`,
      workspaceId,
      projectSlug,
    )
    .catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.insight_key, r]));
}

/** Nightly: measures every outcome whose four weeks are up. */
export async function measureDueOutcomes(limit = 50) {
  await ensureAdditiveSchema();
  const due = await prisma.$queryRawUnsafe<
    Array<{ id: string; workspace_id: string; project_slug: string; category: string; metric: string; baseline: number; marked_at: Date; detail: { labels?: string[]; table?: string; lowerIsBetter?: boolean } | null }>
  >(
    `SELECT id::text AS id, workspace_id, project_slug, category, metric, baseline, marked_at, detail FROM recommendation_outcome
     WHERE measured_at IS NULL AND measure_after <= CURRENT_TIMESTAMP ORDER BY measure_after LIMIT ${Math.max(1, Math.min(200, limit))}`,
  );
  let measured = 0;
  for (const row of due) {
    try {
      const meta = row.detail ?? {};
      const target: Target = { ...outcomeTarget({ category: row.category as IntelligenceInsight["category"], impactUnit: row.metric === "conversions" ? "conversions" : undefined, evidence: [{ table: (meta.table ?? "ga4_source_daily") as never, from: "", to: "", metrics: {} }] }), metric: row.metric };
      const start = new Date(new Date(row.marked_at).getTime() + DAY);
      const result = await measure(row.workspace_id, row.project_slug, target, meta.labels ?? [], start, new Date(start.getTime() + (WINDOW_DAYS - 1) * DAY));
      const change = (result.value - row.baseline) / Math.max(row.baseline, 1);
      const lift = meta.lowerIsBetter ? -change : change;
      await prisma.$executeRawUnsafe(
        `UPDATE recommendation_outcome SET measured_at = CURRENT_TIMESTAMP, result = $2, lift = $3 WHERE id = $1::uuid`,
        row.id,
        result.value,
        Math.round(lift * 1000) / 1000,
      );
      measured++;
    } catch (error) {
      console.warn("OUTCOME_MEASURE_FAILED", row.id, error instanceof Error ? error.message : error);
    }
  }
  return { due: due.length, measured };
}

export async function loadTrust(workspaceId: string): Promise<(provider: string, category: string) => number> {
  const rows = await prisma
    .$queryRawUnsafe<Array<{ provider: string; category: string; wins: bigint; total: bigint }>>(
      // Learn across all organizations: advice quality is a property of the model and the kind of finding.
      `SELECT p.provider, o.category, SUM(CASE WHEN o.lift > 0.02 THEN 1 ELSE 0 END)::bigint AS wins, COUNT(*)::bigint AS total
       FROM recommendation_outcome o, jsonb_array_elements_text(o.providers) AS p(provider)
       WHERE o.lift IS NOT NULL GROUP BY 1, 2`,
    )
    .catch(() => []);
  void workspaceId;
  const table = new Map(rows.map((r) => [`${r.provider}|${r.category}`, trustWeight(Number(r.wins), Number(r.total))]));
  return (provider, category) => table.get(`${provider}|${category}`) ?? 1;
}
