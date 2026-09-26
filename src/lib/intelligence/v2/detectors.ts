/**
 * v2 detectors. Each one reads the aggregates, compares the selected window
 * with the previous equal window where that matters, and returns zero or one
 * finding with an impact estimate in its own unit and a confidence (0–1).
 * Nothing is padded: a detector with nothing material to say returns null.
 */
import type { EvidenceAggregates, QueryAgg } from "@/lib/intelligence/v2/evidence-queries";
import type { IntelligenceCategory, IntelligenceSeverity } from "@/lib/intelligence/contracts";

export type Finding = {
  key: string;
  category: IntelligenceCategory;
  title: string;
  finding: string;
  rationale: string;
  action: string;
  expectedOutcome: string;
  impact: number;
  unit: "clicks" | "sessions" | "engaged sessions" | "conversions" | "impressions";
  confidence: number;
  severity: IntelligenceSeverity;
  table: "ga4_source_daily" | "ga4_landing_page_daily" | "gsc_query_daily" | "gsc_page_daily";
  comparison?: { label: string; current: number; previous: number; unit: string };
  rowHeaders?: string[];
  rows?: Array<{ label: string; values: string[] }>;
};

export type DetectorContext = {
  agg: EvidenceAggregates;
  brandTokens: string[];
  hostCore: string | null;
};

// Approximate organic CTR by position (industry benchmark curve, not a target).
const CTR_CURVE = [0, 0.28, 0.155, 0.1, 0.07, 0.052, 0.04, 0.032, 0.026, 0.021, 0.018];
export function expectedCtr(position: number): number {
  if (!position || position < 1) return 0;
  if (position <= 10) {
    const lo = Math.floor(position);
    const hi = Math.min(10, lo + 1);
    const t = position - lo;
    return CTR_CURVE[lo] * (1 - t) + CTR_CURVE[hi] * t;
  }
  if (position <= 20) return 0.012;
  return 0.005;
}

const SPAM = /(casino|slot|gacor|togel|judi|poker|baccarat|jackpot|betting|\bbet\d*\b|\d+\s?win\b|\bwin\s?\d+|\bbom\s?\d+|\bsbobet|\bxxx\b|porn|viagra|cialis|escort)/i;
export function isSpamQuery(query: string) {
  return SPAM.test(query);
}

export function isBrandQuery(query: string, ctx: Pick<DetectorContext, "brandTokens" | "hostCore">) {
  const q = query.toLowerCase();
  const compact = q.replace(/[^a-z0-9]/g, "");
  if (ctx.hostCore && ctx.hostCore.length >= 4 && (compact.includes(ctx.hostCore) || (compact.length >= 5 && ctx.hostCore.includes(compact)))) return true;
  const words = q.split(/[^a-z0-9]+/);
  return ctx.brandTokens.some((token) => words.includes(token));
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmt = (value: number) => Math.round(value).toLocaleString("en-US");
const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const signedPct = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(0)}%`;
const pos = (value: number) => (value ? value.toFixed(1) : "—");
const shortUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
};

/** Confidence from sample size (log-scaled) and whether the comparison window has data. */
function confidenceFrom(sample: number, needsComparison: boolean, ctx: DetectorContext, source: "ga4" | "gsc") {
  const base = Math.min(1, Math.log10(Math.max(1, sample)) / 4); // 10k units → 1.0
  if (!needsComparison) return Math.max(0.2, base);
  const { ga4CurDays, ga4PrevDays, gscCurDays, gscPrevDays } = ctx.agg.coverage;
  const coverage = source === "ga4" ? (ga4CurDays ? ga4PrevDays / ga4CurDays : 0) : gscCurDays ? gscPrevDays / gscCurDays : 0;
  return Math.max(0.15, base * Math.min(1, coverage));
}

function hasComparison(ctx: DetectorContext, source: "ga4" | "gsc") {
  const { ga4CurDays, ga4PrevDays, gscCurDays, gscPrevDays } = ctx.agg.coverage;
  return source === "ga4" ? ga4CurDays > 0 && ga4PrevDays >= ga4CurDays * 0.6 : gscCurDays > 0 && gscPrevDays >= gscCurDays * 0.6;
}

function cleanQueries(ctx: DetectorContext) {
  return ctx.agg.queries.filter((row) => !isSpamQuery(row.label));
}

/* 1. Traffic change, decomposed by source */
export function trafficChange(ctx: DetectorContext): Finding | null {
  if (!hasComparison(ctx, "ga4")) return null;
  const cur = ctx.agg.sources.reduce((t, r) => t + r.cur, 0);
  const prev = ctx.agg.sources.reduce((t, r) => t + r.prev, 0);
  if (prev < 100) return null;
  const change = (cur - prev) / prev;
  if (Math.abs(change) < 0.1) return null;
  const delta = cur - prev;
  const drivers = [...ctx.agg.sources]
    .map((r) => ({ ...r, delta: r.cur - r.prev }))
    .filter((r) => Math.sign(r.delta) === Math.sign(delta))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
  const top = drivers[0];
  const share = top ? Math.abs(top.delta / delta) : 0;
  const down = delta < 0;
  const channel = top?.label ?? "";
  const action = down
    ? /organic|google \/ organic|bing/.test(channel)
      ? "Open SEO → check the ranking movers and page decay findings below; most of this drop is organic."
      : /cpc|paid|ads/.test(channel)
        ? "Review paid campaigns for budget cuts, paused ads or disapprovals in the same dates."
        : /direct/.test(channel)
          ? "Check tagging changes and brand demand: direct traffic drops often come from broken tracking or fewer returning visitors."
          : `Investigate ${channel}: confirm referral links or campaigns that stopped sending traffic.`
    : `Double down on ${channel}: find the pages it lands on in Behavior and extend what is working.`;
  return {
    key: "traffic_change",
    category: "traffic_change",
    title: `Sessions ${down ? "down" : "up"} ${signedPct(change).replace(/^[+−]/, "")} vs the previous ${ctx.agg.window.days} days${top ? ` — ${channel} drove ${pct(share, 0)} of it` : ""}`,
    finding: `${fmt(cur)} sessions this period against ${fmt(prev)} before (${signedPct(change)}).`,
    rationale: drivers.map((d) => `${d.label}: ${fmt(d.prev)} → ${fmt(d.cur)}`).join(" · "),
    action,
    expectedOutcome: down ? `Recover up to ${fmt(Math.abs(delta))} sessions per period.` : `Sustain the ${fmt(delta)}-session gain.`,
    impact: Math.abs(delta),
    unit: "sessions",
    confidence: confidenceFrom(prev, true, ctx, "ga4"),
    severity: down && Math.abs(change) >= 0.2 ? "high" : "medium",
    table: "ga4_source_daily",
    comparison: { label: "Sessions", current: cur, previous: prev, unit: "sessions" },
    rowHeaders: ["Source / medium", "Before", "Now", "Change"],
    rows: drivers.map((d) => ({ label: d.label, values: [fmt(d.prev), fmt(d.cur), `${d.delta >= 0 ? "+" : ""}${fmt(d.delta)}`] })),
  };
}

/* 2. Ranking movers (losers) */
export function rankingMovers(ctx: DetectorContext): Finding | null {
  if (!hasComparison(ctx, "gsc")) return null;
  const losers = cleanQueries(ctx)
    .filter((r) => r.prevImpr >= 50 && r.curImpr >= 20 && r.curPos - r.prevPos >= 2 && r.prevPos > 0 && r.prevPos <= 20)
    .map((r) => ({ ...r, lost: Math.max(0, r.prevClicks - r.curClicks) }))
    .filter((r) => r.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 6);
  const lost = losers.reduce((t, r) => t + r.lost, 0);
  if (losers.length === 0 || lost < 5) return null;
  return {
    key: "ranking_movers",
    category: "ranking_movement",
    title: `${count(losers.length, "query", "queries")} slipped in ranking and cost ${fmt(lost)} clicks`,
    finding: `The biggest drop is “${losers[0].label}”: position ${pos(losers[0].prevPos)} → ${pos(losers[0].curPos)}, ${fmt(losers[0].prevClicks)} → ${fmt(losers[0].curClicks)} clicks.`,
    rationale: "Positions are impression-weighted averages for each window; only queries with real impressions in both windows are counted.",
    action: "For each query, open the ranking page, compare it with the pages now above it, and refresh content, internal links and title to match the intent.",
    expectedOutcome: `Win back up to ${fmt(lost)} clicks per period.`,
    impact: lost,
    unit: "clicks",
    confidence: confidenceFrom(losers.reduce((t, r) => t + r.prevImpr, 0), true, ctx, "gsc"),
    severity: lost >= 50 ? "high" : "medium",
    table: "gsc_query_daily",
    rowHeaders: ["Query", "Position", "Clicks", "Lost"],
    rows: losers.map((r) => ({ label: r.label, values: [`${pos(r.prevPos)} → ${pos(r.curPos)}`, `${fmt(r.prevClicks)} → ${fmt(r.curClicks)}`, fmt(r.lost)] })),
  };
}

/* 3. CTR gap versus the position curve */
export function ctrGap(ctx: DetectorContext): Finding | null {
  const minImpr = Math.max(50, totalImpr(ctx) * 0.002);
  const gaps = cleanQueries(ctx)
    .filter((r) => r.curImpr >= minImpr && r.curPos > 0 && r.curPos <= 10)
    .map((r) => {
      const ctr = r.curClicks / r.curImpr;
      const expected = expectedCtr(r.curPos);
      return { ...r, ctr, expected, extra: r.curImpr * (expected * 0.8 - ctr) };
    })
    .filter((r) => r.ctr < r.expected * 0.6 && r.extra >= 3)
    .sort((a, b) => b.extra - a.extra)
    .slice(0, 6);
  const extra = gaps.reduce((t, r) => t + r.extra, 0);
  if (gaps.length === 0 || extra < 5) return null;
  return {
    key: "ctr_gap",
    category: "ctr_gap",
    title: `${count(gaps.length, "page-one query gets", "page-one queries get")} far fewer clicks than position should predict — about ${fmt(extra)} clicks missed`,
    finding: `“${gaps[0].label}” sits at position ${pos(gaps[0].curPos)} but converts ${pct(gaps[0].ctr)} of impressions into clicks; that position typically earns about ${pct(gaps[0].expected, 0)}.`,
    rationale: "Expected CTR comes from a benchmark curve by position. The shortfall is scored at 80% of that curve so estimates stay conservative.",
    action: "Rewrite titles and meta descriptions for these queries to match the searcher's wording, and add structured data where it applies.",
    expectedOutcome: `About ${fmt(extra)} extra clicks per period without any ranking change.`,
    impact: extra,
    unit: "clicks",
    confidence: confidenceFrom(gaps.reduce((t, r) => t + r.curImpr, 0), false, ctx, "gsc"),
    severity: extra >= 100 ? "high" : "medium",
    table: "gsc_query_daily",
    rowHeaders: ["Query", "Position", "CTR", "Typical"],
    rows: gaps.map((r) => ({ label: r.label, values: [pos(r.curPos), pct(r.ctr), pct(r.expected, 0)] })),
  };
}

/* 4. Striking distance (positions 8–20) */
export function strikingDistance(ctx: DetectorContext): Finding | null {
  const minImpr = Math.max(40, totalImpr(ctx) * 0.001);
  const rows = cleanQueries(ctx)
    .filter((r) => r.curImpr >= minImpr && r.curPos >= 8 && r.curPos <= 20)
    .map((r) => ({ ...r, gain: r.curImpr * expectedCtr(4) - r.curClicks }))
    .filter((r) => r.gain > 2)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 6);
  const gain = rows.reduce((t, r) => t + r.gain, 0);
  if (rows.length === 0 || gain < 5) return null;
  return {
    key: "striking_distance",
    category: "striking_distance",
    title: `${count(rows.length, "query is", "queries are")} one push from page one — worth about ${fmt(gain)} clicks`,
    finding: `“${rows[0].label}” has ${fmt(rows[0].curImpr)} impressions at position ${pos(rows[0].curPos)}.`,
    rationale: "Queries at positions 8–20 already rank; moving them to about position 4 is usually cheaper than ranking a new page.",
    action: "Strengthen the ranking page for each query: add a section answering it directly, link to it from related pages, and update the title.",
    expectedOutcome: `Up to ${fmt(gain)} more clicks per period if they reach position ~4.`,
    impact: gain * 0.5,
    unit: "clicks",
    confidence: confidenceFrom(rows.reduce((t, r) => t + r.curImpr, 0), false, ctx, "gsc") * 0.8,
    severity: gain >= 150 ? "high" : "medium",
    table: "gsc_query_daily",
    rowHeaders: ["Query", "Impressions", "Position", "Clicks"],
    rows: rows.map((r) => ({ label: r.label, values: [fmt(r.curImpr), pos(r.curPos), fmt(r.curClicks)] })),
  };
}

/* 5. Page decay */
export function pageDecay(ctx: DetectorContext): Finding | null {
  if (!hasComparison(ctx, "gsc")) return null;
  const rows = ctx.agg.pages
    .filter((r) => r.prevClicks >= 15 && r.curClicks < r.prevClicks * 0.75)
    .map((r) => ({ ...r, lost: r.prevClicks - r.curClicks }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 6);
  const lost = rows.reduce((t, r) => t + r.lost, 0);
  if (rows.length === 0 || lost < 10) return null;
  return {
    key: "page_decay",
    category: "page_decay",
    title: `${count(rows.length, "page", "pages")} lost ${fmt(lost)} search clicks vs the previous period`,
    finding: `${shortUrl(rows[0].label)} fell from ${fmt(rows[0].prevClicks)} to ${fmt(rows[0].curClicks)} clicks (position ${pos(rows[0].prevPos)} → ${pos(rows[0].curPos)}).`,
    rationale: "A page that loses clicks while impressions hold has a CTR problem; one that loses impressions has a ranking or indexing problem.",
    action: "Check each page in Search Console → URL inspection for indexing issues, then refresh its content and compare against the pages now outranking it.",
    expectedOutcome: `Recover up to ${fmt(lost)} clicks per period.`,
    impact: lost,
    unit: "clicks",
    confidence: confidenceFrom(rows.reduce((t, r) => t + r.prevClicks, 0) * 10, true, ctx, "gsc"),
    severity: lost >= 100 ? "high" : "medium",
    table: "gsc_page_daily",
    rowHeaders: ["Page", "Clicks", "Impressions", "Position"],
    rows: rows.map((r) => ({ label: shortUrl(r.label), values: [`${fmt(r.prevClicks)} → ${fmt(r.curClicks)}`, `${fmt(r.prevImpr)} → ${fmt(r.curImpr)}`, `${pos(r.prevPos)} → ${pos(r.curPos)}`] })),
  };
}

/* 6. Landing-page engagement outliers */
export function landingQuality(ctx: DetectorContext): Finding | null {
  const total = ctx.agg.landings.reduce((t, r) => t + r.cur, 0);
  const engaged = ctx.agg.landings.reduce((t, r) => t + r.curEngaged, 0);
  if (total < 200 || engaged === 0) return null;
  const siteRate = engaged / total;
  const rows = ctx.agg.landings
    .filter((r) => r.cur >= Math.max(30, total * 0.02) && r.label !== "(not set)")
    .map((r) => ({ ...r, rate: r.curEngaged / Math.max(1, r.cur) }))
    .filter((r) => r.rate < siteRate * 0.6)
    .map((r) => ({ ...r, lost: r.cur * (siteRate - r.rate) }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 6);
  const lost = rows.reduce((t, r) => t + r.lost, 0);
  if (rows.length === 0 || lost < 10) return null;
  return {
    key: "landing_quality",
    category: "landing_quality",
    title: `${count(rows.length, "busy landing page engages", "busy landing pages engage")} far below the site average (${pct(siteRate, 0)})`,
    finding: `${rows[0].label} took ${fmt(rows[0].cur)} sessions but only ${pct(rows[0].rate, 0)} engaged.`,
    rationale: "Engagement = sessions longer than 10 s, with 2+ page views or a key event (GA4 definition). Pages far below the site rate usually mismatch the visitor's intent or load slowly.",
    action: "Check each page's load speed and first screen: make the headline match the query or ad that sends traffic, and put the main call to action above the fold.",
    expectedOutcome: `About ${fmt(lost)} more engaged sessions per period at the site-average rate.`,
    impact: lost,
    unit: "engaged sessions",
    confidence: confidenceFrom(rows.reduce((t, r) => t + r.cur, 0), false, ctx, "ga4"),
    severity: lost >= 200 ? "high" : "medium",
    table: "ga4_landing_page_daily",
    rowHeaders: ["Landing page", "Sessions", "Engaged", "Site avg"],
    rows: rows.map((r) => ({ label: r.label || "/", values: [fmt(r.cur), pct(r.rate, 0), pct(siteRate, 0)] })),
  };
}

/* 7. Conversion leaks (or missing conversion tracking) */
export function conversionLeak(ctx: DetectorContext): Finding | null {
  const sessions = ctx.agg.sources.reduce((t, r) => t + r.cur, 0);
  const conv = ctx.agg.sources.reduce((t, r) => t + r.curConv, 0);
  if (sessions < 200) return null;
  if (conv === 0) {
    return {
      key: "conversion_tracking",
      category: "conversion_leak",
      title: `No key events recorded across ${fmt(sessions)} sessions`,
      finding: "GA4 reports zero key events (conversions) for this period, so no channel or page can be judged on outcomes.",
      rationale: "Either conversions are not marked as key events in GA4, or the tags that fire them are broken.",
      action: "In GA4 → Admin → Events, mark your lead, call or purchase events as key events, then confirm they fire with DebugView.",
      expectedOutcome: "Every later finding can be ranked by business outcome instead of traffic.",
      impact: sessions * 0.02,
      unit: "conversions",
      confidence: 0.9,
      severity: "high",
      table: "ga4_source_daily",
    };
  }
  const rate = conv / sessions;
  const rows = ctx.agg.sources
    .filter((r) => r.cur >= Math.max(50, sessions * 0.05) && r.curConv / Math.max(1, r.cur) < rate * 0.35)
    .map((r) => ({ ...r, missed: r.cur * rate - r.curConv }))
    .sort((a, b) => b.missed - a.missed)
    .slice(0, 5);
  const missed = rows.reduce((t, r) => t + r.missed, 0);
  if (rows.length === 0 || missed < 1) return null;
  return {
    key: "conversion_leak",
    category: "conversion_leak",
    title: `${count(rows.length, "traffic source converts", "traffic sources convert")} far below the site rate (${pct(rate, 2)})`,
    finding: `${rows[0].label} sent ${fmt(rows[0].cur)} sessions and ${fmt(rows[0].curConv)} key events.`,
    rationale: "Sources that bring traffic without outcomes are either the wrong audience or land on pages without a clear next step.",
    action: "For each source, check which landing pages it uses (Behavior) and add or fix the call to action there; cut spend on paid sources that still don't convert.",
    expectedOutcome: `About ${fmt(missed)} more key events per period at the site rate.`,
    impact: missed,
    unit: "conversions",
    confidence: confidenceFrom(rows.reduce((t, r) => t + r.cur, 0), false, ctx, "ga4"),
    severity: missed >= 10 ? "high" : "medium",
    table: "ga4_source_daily",
    rowHeaders: ["Source / medium", "Sessions", "Key events", "Rate"],
    rows: rows.map((r) => ({ label: r.label, values: [fmt(r.cur), fmt(r.curConv), pct(r.curConv / Math.max(1, r.cur), 2)] })),
  };
}

/* 8. Brand vs non-brand search demand */
export function brandSplit(ctx: DetectorContext): Finding | null {
  if (ctx.brandTokens.length === 0 && !ctx.hostCore) return null;
  const rows = cleanQueries(ctx);
  let brand = 0;
  let nonBrand = 0;
  let nonBrandImpr = 0;
  let prevBrand = 0;
  let prevNon = 0;
  for (const r of rows) {
    if (isBrandQuery(r.label, ctx)) {
      brand += r.curClicks;
      prevBrand += r.prevClicks;
    } else {
      nonBrand += r.curClicks;
      nonBrandImpr += r.curImpr;
      prevNon += r.prevClicks;
    }
  }
  const total = brand + nonBrand;
  if (total < 30) return null;
  const brandShare = brand / total;
  if (brandShare < 0.6) return null;
  const trend = hasComparison(ctx, "gsc") && prevNon > 0 ? ` Non-brand clicks ${signedPct((nonBrand - prevNon) / prevNon)} vs the previous period.` : "";
  return {
    key: "brand_split",
    category: "brand_split",
    title: `${pct(brandShare, 0)} of search clicks are people already searching for the brand`,
    finding: `${fmt(brand)} branded vs ${fmt(nonBrand)} non-branded clicks. Non-brand queries earned ${fmt(nonBrandImpr)} impressions.${trend}`,
    rationale: "Branded clicks measure existing demand; growth comes from non-brand queries where new customers discover the business.",
    action: "Pick the 5 non-brand service or product topics with the most impressions and give each a dedicated, well-linked page.",
    expectedOutcome: "A larger share of clicks from new customers who don't know the brand yet.",
    impact: Math.max(0, nonBrandImpr * 0.02 - nonBrand),
    unit: "clicks",
    confidence: confidenceFrom(total * 10, false, ctx, "gsc") * 0.7,
    severity: "medium",
    table: "gsc_query_daily",
    comparison: prevBrand + prevNon > 0 ? { label: "Non-brand clicks", current: nonBrand, previous: prevNon, unit: "clicks" } : undefined,
  };
}

/* 9. Anomalous days (robust z-score on daily sessions and clicks) */
export function anomalies(ctx: DetectorContext): Finding | null {
  const series = [
    { name: "sessions", data: ctx.agg.dailySessions, table: "ga4_source_daily" as const },
    { name: "search clicks", data: ctx.agg.dailyClicks, table: "gsc_page_daily" as const },
  ];
  const hits: Array<{ series: string; date: string; value: number; median: number; z: number; table: Finding["table"] }> = [];
  for (const s of series) {
    if (s.data.length < 14) continue;
    const values = s.data.map((d) => d.value).sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    const mad = [...values.map((v) => Math.abs(v - median))].sort((a, b) => a - b)[Math.floor(values.length / 2)] || 1;
    // The last day is often partial in Google's data, so it is never flagged.
    for (const d of s.data.slice(0, -1)) {
      const z = (0.6745 * (d.value - median)) / mad;
      if (Math.abs(z) >= 3.5 && Math.abs(d.value - median) >= 10) hits.push({ series: s.name, date: d.date, value: d.value, median, z, table: s.table });
    }
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const top = hits.slice(0, 5);
  const first = top[0];
  return {
    key: "anomalies",
    category: "anomaly",
    title: `${hits.length} unusual day${hits.length === 1 ? "" : "s"} in traffic — biggest on ${first.date}`,
    finding: `${first.date}: ${fmt(first.value)} ${first.series} against a typical ${fmt(first.median)}.`,
    rationale: "Flagged with a robust z-score (median and median absolute deviation), so one spike cannot hide another.",
    action: "Match each date against releases, campaigns, outages or tracking changes; a spike from one source can also be bot traffic worth filtering.",
    expectedOutcome: "Trends and comparisons that are not distorted by one-off events.",
    impact: top.reduce((t, h) => t + Math.abs(h.value - h.median), 0),
    unit: first.series === "sessions" ? "sessions" : "clicks",
    confidence: 0.7,
    severity: "low",
    table: first.table,
    rowHeaders: ["Date", "Metric", "Value", "Typical"],
    rows: top.map((h) => ({ label: h.date, values: [h.series, fmt(h.value), fmt(h.median)] })),
  };
}

/* 10. Spam query signal */
export function spamSignal(ctx: DetectorContext): Finding | null {
  const total = totalImpr(ctx);
  const spam = ctx.agg.queries.filter((r) => isSpamQuery(r.label));
  const spamImpr = spam.reduce((t, r) => t + r.curImpr, 0);
  if (total === 0 || spamImpr / total < 0.03 || spamImpr < 200) return null;
  const rows = [...spam].sort((a, b) => b.curImpr - a.curImpr).slice(0, 6);
  return {
    key: "spam_signal",
    category: "spam_signal",
    title: `${pct(spamImpr / total, 0)} of search impressions come from spam queries (e.g. “${rows[0].label}”)`,
    finding: `${fmt(spamImpr)} impressions from ${spam.length} gambling or adult-style queries that have nothing to do with the business.`,
    rationale: "These usually mean spam pages were injected into the site, or spammy links point at it. They also drag down CTR and position averages; Anitrya excludes them from the other findings.",
    action: "In Search Console, check Security issues and Pages for URLs you don't recognise; remove injected pages, update the CMS and plugins, and disavow spam links if needed.",
    expectedOutcome: "Cleaner search reporting and protection against a manual penalty.",
    impact: spamImpr,
    unit: "impressions",
    confidence: 0.85,
    severity: spamImpr / total >= 0.15 ? "high" : "medium",
    table: "gsc_query_daily",
    rowHeaders: ["Query", "Impressions", "Clicks", "Position"],
    rows: rows.map((r) => ({ label: r.label, values: [fmt(r.curImpr), fmt(r.curClicks), pos(r.curPos)] })),
  };
}

/* 11. Channel concentration */
export function concentration(ctx: DetectorContext): Finding | null {
  const total = ctx.agg.sources.reduce((t, r) => t + r.cur, 0);
  if (total < 200) return null;
  const top = [...ctx.agg.sources].sort((a, b) => b.cur - a.cur)[0];
  const share = top.cur / total;
  if (share < 0.6) return null;
  return {
    key: "concentration",
    category: "source_concentration",
    title: `${pct(share, 0)} of sessions come from one channel: ${top.label}`,
    finding: `${fmt(top.cur)} of ${fmt(total)} sessions.`,
    rationale: "Heavy dependence on one channel makes traffic fragile to a ranking update, a budget change or a tracking break.",
    action: "Grow a second channel deliberately: the non-brand search topics, email, or a referral partner.",
    expectedOutcome: "Less exposure to a single point of failure.",
    impact: top.cur * 0.1,
    unit: "sessions",
    confidence: 0.6,
    severity: "low",
    table: "ga4_source_daily",
  };
}

function totalImpr(ctx: DetectorContext) {
  return ctx.agg.queries.reduce((t, r) => t + r.curImpr, 0);
}

export const DETECTORS = [
  trafficChange,
  rankingMovers,
  ctrGap,
  strikingDistance,
  pageDecay,
  landingQuality,
  conversionLeak,
  brandSplit,
  anomalies,
  spamSignal,
  concentration,
];

export type { QueryAgg };
