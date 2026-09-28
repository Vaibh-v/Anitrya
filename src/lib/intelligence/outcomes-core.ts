/** Pure outcome helpers (no database). */
import type { IntelligenceInsight } from "@/lib/intelligence/contracts";

export type Target = { table: string; labelExpr: string | null; metric: string; lowerIsBetter: boolean };

/** Which column measures success for a finding, and which rows it is about. */
export function outcomeTarget(insight: Pick<IntelligenceInsight, "category" | "impactUnit" | "evidence">): Target {
  const table = insight.evidence?.[0]?.table ?? "ga4_source_daily";
  const conversions = insight.impactUnit === "conversions";
  switch (table) {
    case "gsc_query_daily":
      return { table, labelExpr: "query", metric: "clicks", lowerIsBetter: insight.category === "spam_signal" };
    case "gsc_page_daily":
      return { table, labelExpr: "page", metric: "clicks", lowerIsBetter: false };
    case "ga4_landing_page_daily":
      return { table, labelExpr: "landing_page", metric: conversions ? "conversions" : "sessions", lowerIsBetter: false };
    case "gsc_query_monthly":
      return { table: "gsc_query_daily", labelExpr: "query", metric: "clicks", lowerIsBetter: false };
    case "ga4_geo_daily":
      return { table, labelExpr: "country", metric: "sessions", lowerIsBetter: true };
    default:
      return {
        table: "ga4_source_daily",
        labelExpr: `COALESCE(NULLIF(source,''),'(direct)') || COALESCE(' / ' || NULLIF(medium,''),'')`,
        metric: conversions ? "conversions" : "sessions",
        lowerIsBetter: false,
      };
  }
}

export function outcomeKey(insight: Pick<IntelligenceInsight, "category" | "rows" | "title">) {
  return `${insight.category}:${insight.rows?.[0]?.label ?? insight.title}`.slice(0, 300);
}

/**
 * Track record → weight. A model's vote on a category is scaled by how often
 * advice it backed actually worked (lift > 2%), with a prior of 1 win in 2 so
 * one result never swings it far. Range 0.5–1.5; 1 when there is no history.
 */
export function trustWeight(wins: number, total: number) {
  if (total <= 0) return 1;
  const rate = (wins + 1) / (total + 2);
  return Math.round((0.5 + rate) * 100) / 100;
}

