/**
 * Anitrya analyst: lets the AI decide which measurements it needs before it
 * answers. Step 1 (plan) — a fast model picks up to three lookups from a fixed
 * catalogue. Step 2 (look up) — the lookups run on this project's own synced
 * data. Step 3 (answer) — the usual AI panel answers with those rows as
 * evidence, so every number it cites is still checked against the data.
 *
 * The model never writes SQL and never sees another project: each lookup is
 * a fixed, scoped function over data that is already aggregated.
 */
import type { EvidenceAggregates, QueryAgg } from "@/lib/intelligence/v2/evidence-queries";
import type { GeoSummary } from "@/lib/integrations/google/ga4/fetch-ga4-geo";
import { availableProviders, complete, type ProviderConfig } from "@/lib/ai/providers";

export type LookupSection = { tool: string; title: string; headers: string[]; rows: Array<{ label: string; values: string[] }> };

type Data = { agg: EvidenceAggregates; geo: GeoSummary };
type Args = { sort?: string; level?: string; metric?: string; limit?: number };

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pos = (n: number) => (n ? n.toFixed(1) : "—");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const lim = (a: Args, d = 8) => Math.max(3, Math.min(12, Number(a.limit) || d));

function searchRows(rows: QueryAgg[], a: Args) {
  const sort = a.sort ?? "clicks";
  const key: Record<string, (r: QueryAgg) => number> = {
    clicks: (r) => r.curClicks,
    impressions: (r) => r.curImpr,
    lost_clicks: (r) => r.prevClicks - r.curClicks,
    gained_clicks: (r) => r.curClicks - r.prevClicks,
    low_ctr: (r) => (r.curImpr >= 100 ? r.curImpr * (1 - r.curClicks / r.curImpr) : 0),
    near_page_one: (r) => (r.curPos >= 8 && r.curPos <= 20 ? r.curImpr : 0),
  };
  const by = key[sort] ?? key.clicks;
  return [...rows]
    .filter((r) => by(r) > 0)
    .sort((x, y) => by(y) - by(x))
    .slice(0, lim(a))
    .map((r) => ({ label: r.label, values: [fmt(r.curClicks), fmt(r.prevClicks), fmt(r.curImpr), pos(r.curPos), pos(r.prevPos)] }));
}

export const TOOLS: Record<string, { describe: string; run: (d: Data, a: Args) => Omit<LookupSection, "tool"> }> = {
  search_queries: {
    describe: 'Search Console queries. sort: "clicks" | "impressions" | "lost_clicks" | "gained_clicks" | "low_ctr" | "near_page_one"',
    run: (d, a) => ({
      title: `Search queries by ${(a.sort ?? "clicks").replace(/_/g, " ")}`,
      headers: ["Query", "Clicks now", "Clicks before", "Impressions", "Position now", "Position before"],
      rows: searchRows(d.agg.queries, a),
    }),
  },
  search_pages: {
    describe: 'Search Console pages. sort: same options as search_queries',
    run: (d, a) => ({
      title: `Pages in search by ${(a.sort ?? "clicks").replace(/_/g, " ")}`,
      headers: ["Page", "Clicks now", "Clicks before", "Impressions", "Position now", "Position before"],
      rows: searchRows(d.agg.pages, a),
    }),
  },
  traffic_sources: {
    describe: 'GA4 source / medium. sort: "sessions" | "lost_sessions" | "gained_sessions" | "conversions"',
    run: (d, a) => {
      const by: Record<string, (r: EvidenceAggregates["sources"][number]) => number> = {
        sessions: (r) => r.cur,
        lost_sessions: (r) => r.prev - r.cur,
        gained_sessions: (r) => r.cur - r.prev,
        conversions: (r) => r.curConv,
      };
      const f = by[a.sort ?? "sessions"] ?? by.sessions;
      return {
        title: `Traffic sources by ${(a.sort ?? "sessions").replace(/_/g, " ")}`,
        headers: ["Source / medium", "Sessions now", "Sessions before", "Key events now", "Key events before"],
        rows: [...d.agg.sources].filter((r) => f(r) > 0).sort((x, y) => f(y) - f(x)).slice(0, lim(a)).map((r) => ({ label: r.label, values: [fmt(r.cur), fmt(r.prev), fmt(r.curConv), fmt(r.prevConv)] })),
      };
    },
  },
  landing_pages: {
    describe: 'GA4 landing pages. sort: "sessions" | "lost_sessions" | "conversion_rate" | "engagement"',
    run: (d, a) => {
      const by: Record<string, (r: EvidenceAggregates["landings"][number]) => number> = {
        sessions: (r) => r.cur,
        lost_sessions: (r) => r.prev - r.cur,
        conversion_rate: (r) => (r.cur >= 20 ? r.curConv / r.cur : 0),
        engagement: (r) => (r.cur >= 20 ? r.curEngaged / r.cur : 0),
      };
      const f = by[a.sort ?? "sessions"] ?? by.sessions;
      return {
        title: `Landing pages by ${(a.sort ?? "sessions").replace(/_/g, " ")}`,
        headers: ["Landing page", "Sessions now", "Sessions before", "Engaged rate", "Key events"],
        rows: [...d.agg.landings].filter((r) => f(r) > 0).sort((x, y) => f(y) - f(x)).slice(0, lim(a)).map((r) => ({ label: r.label, values: [fmt(r.cur), fmt(r.prev), r.cur ? pct(r.curEngaged / r.cur) : "—", fmt(r.curConv)] })),
      };
    },
  },
  geography: {
    describe: 'Where visitors come from. level: "country" | "region" | "city"',
    run: (d, a) => {
      const level = a.level === "city" ? "cities" : a.level === "region" ? "regions" : "countries";
      const list = d.geo[level];
      return {
        title: `Visitors by ${level === "cities" ? "city" : level === "regions" ? "region" : "country"}`,
        headers: ["Place", "Sessions", "Share", "Key events"],
        rows: list.slice(0, lim(a)).map((r) => ({ label: r.name, values: [fmt(r.sessions), d.geo.totalSessions ? pct(r.sessions / d.geo.totalSessions) : "—", fmt(r.keyEvents)] })),
      };
    },
  },
  seasonal_demand: {
    describe: "What searchers did in this month and next month LAST YEAR (from Search Console history) — use for questions about the coming season or next month",
    run: (d, a) => {
      const season = d.agg.season;
      if (!season) return { title: "Seasonal demand (no history synced yet)", headers: ["Query"], rows: [] };
      const rows = [...season.queries]
        .filter((r) => r.nextLy > 0 || r.thisLy > 0)
        .sort((x, y) => y.nextLy - y.thisLy - (x.nextLy - x.thisLy))
        .slice(0, lim(a, 10))
        .map((r) => ({ label: r.label, values: [fmt(r.thisLy), fmt(r.nextLy), fmt(r.thisNow)] }));
      return { title: `Search demand ${season.thisMonth} → ${season.nextMonth}, last year`, headers: ["Query", `${season.thisMonth} last year`, `${season.nextMonth} last year`, `${season.thisMonth} this year`], rows };
    },
  },
  daily_trend: {
    describe: 'Day-by-day totals for the window. metric: "sessions" | "clicks"',
    run: (d, a) => {
      const series = a.metric === "clicks" ? d.agg.dailyClicks : d.agg.dailySessions;
      const inWindow = series.filter((r) => r.date >= d.agg.window.from);
      // Weekly buckets keep the packet small while showing the shape.
      const weeks: Array<{ label: string; values: string[] }> = [];
      for (let i = 0; i < inWindow.length; i += 7) {
        const chunk = inWindow.slice(i, i + 7);
        weeks.push({ label: `${chunk[0].date} → ${chunk[chunk.length - 1].date}`, values: [fmt(chunk.reduce((t, r) => t + r.value, 0))] });
      }
      return { title: `Weekly ${a.metric === "clicks" ? "search clicks" : "sessions"}`, headers: ["Week", a.metric === "clicks" ? "Clicks" : "Sessions"], rows: weeks };
    },
  },
};

const PLAN_SYSTEM = `You choose which measurements to look up before a marketing question is answered.
Available lookups (name — arguments):
${Object.entries(TOOLS)
  .map(([name, t]) => `- ${name} — ${t.describe}`)
  .join("\n")}
Pick 1 to 3 lookups that best answer the question. Reply with JSON only: {"lookups":[{"name": string, "sort"?: string, "level"?: string, "metric"?: string}]}`;

/** Keyword fallback when no model is available to plan. */
export function heuristicPlan(question: string): Array<{ name: string } & Args> {
  const q = question.toLowerCase();
  const plan: Array<{ name: string } & Args> = [];
  if (/where|country|city|cities|location|region|bot|spam|singapore|china|india/.test(q)) plan.push({ name: "geography", level: /city|cities|local/.test(q) ? "city" : "country" });
  if (/keyword|query|queries|rank|search|seo|google/.test(q)) plan.push({ name: "search_queries", sort: /drop|lost|down|fell|decline/.test(q) ? "lost_clicks" : /opportunit|miss|grow/.test(q) ? "near_page_one" : "clicks" });
  if (/page|landing|convert|conversion|lead|bounce|engag/.test(q)) plan.push({ name: "landing_pages", sort: /convert|conversion|lead/.test(q) ? "conversion_rate" : "sessions" });
  if (/source|channel|traffic|referral|paid|ads|social|direct/.test(q)) plan.push({ name: "traffic_sources", sort: /drop|lost|down|fell/.test(q) ? "lost_sessions" : "sessions" });
  if (/season|next month|coming month|coming season|upcoming|last year|peak|demand|winter|summer|holiday|october|november|december/.test(q)) plan.push({ name: "seasonal_demand" });
  if (/trend|week|over time|when|spike|dip/.test(q)) plan.push({ name: "daily_trend", metric: /click|search/.test(q) ? "clicks" : "sessions" });
  if (plan.length === 0) plan.push({ name: "search_queries", sort: "near_page_one" }, { name: "traffic_sources", sort: "sessions" });
  return plan.slice(0, 3);
}

function parsePlan(raw: string): Array<{ name: string } & Args> {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as { lookups?: Array<{ name?: string } & Args> };
  return (parsed.lookups ?? [])
    .filter((l): l is { name: string } & Args => typeof l?.name === "string" && l.name in TOOLS)
    .slice(0, 3);
}

async function plan(question: string, providers: ProviderConfig[]) {
  // The quickest reliable planners first; planning is a tiny call.
  const order = ["groq", "cerebras", "openai", "anthropic", "gemini", "mistral", "openrouter", "github"];
  const planner = [...providers].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))[0];
  if (!planner) return { lookups: heuristicPlan(question), by: "rules" };
  try {
    const lookups = parsePlan(await complete(planner, PLAN_SYSTEM, `Question: ${question}`, 8000));
    if (lookups.length) return { lookups, by: planner.label };
  } catch {
    /* fall back to rules */
  }
  return { lookups: heuristicPlan(question), by: "rules" };
}

/** Plans and runs the lookups for one question. Never throws; returns what it could find. */
export async function lookUp(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  question: string;
  allowTraining: boolean;
}): Promise<{ sections: LookupSection[]; plannedBy: string }> {
  const providers = availableProviders({ allowTraining: input.allowTraining });
  // Loaded lazily so the lookup catalogue stays importable without a database.
  const [{ loadEvidenceAggregates }, { getGeoSummary }] = await Promise.all([
    import("@/lib/intelligence/v2/evidence-queries"),
    import("@/lib/integrations/google/ga4/fetch-ga4-geo"),
  ]);
  const [planned, agg, geo] = await Promise.all([
    plan(input.question, providers),
    loadEvidenceAggregates(input),
    getGeoSummary(input).catch(() => ({ countries: [], regions: [], cities: [], totalSessions: 0 })),
  ]);
  const data = { agg, geo };
  const seen = new Set<string>();
  const sections: LookupSection[] = [];
  for (const lookup of planned.lookups) {
    const id = JSON.stringify(lookup);
    if (seen.has(id)) continue;
    seen.add(id);
    const section = TOOLS[lookup.name].run(data, lookup);
    if (section.rows.length) sections.push({ tool: lookup.name, ...section });
  }
  return { sections, plannedBy: planned.by };
}
