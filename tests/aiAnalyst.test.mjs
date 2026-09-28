import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const a = await import("../src/lib/ai/analyst.ts");
const { buildWindow } = await import("../src/lib/intelligence/v2/window.ts");

const q = (label, curClicks, curImpr, curPos, prevClicks = 0) => ({ label, curClicks, curImpr, curPos, prevClicks, prevImpr: 0, prevPos: 0 });
const data = {
  agg: {
    window: buildWindow("2026-09-01", "2026-09-14"),
    sources: [{ label: "google / organic", cur: 400, prev: 520, curEngaged: 200, curConv: 3, prevConv: 5 }],
    landings: [],
    queries: [q("water heater repair", 5, 2195, 19.1, 30), q("plumber", 40, 900, 3.6, 38)],
    pages: [],
    dailySessions: Array.from({ length: 28 }, (_, i) => ({ date: `2026-08-${String(18 + i).padStart(2, "0")}`.replace("2026-08-3", "2026-09-0").slice(0, 10), value: 10 })),
    dailyClicks: [],
    countries: [],
    coverage: { ga4CurDays: 14, ga4PrevDays: 14, gscCurDays: 14, gscPrevDays: 14 },
  },
  geo: { countries: [{ id: "SG", name: "Singapore", sessions: 700, users: 690, keyEvents: 0 }], regions: [], cities: [], totalSessions: 2500 },
};

test("rules planner picks lookups that match the question", () => {
  assert.deepEqual(a.heuristicPlan("why is traffic coming from Singapore?").map((l) => l.name), ["geography", "traffic_sources"]);
  assert.equal(a.heuristicPlan("which keywords dropped?")[0].sort, "lost_clicks");
  assert.ok(a.heuristicPlan("hello").length > 0, "always looks something up");
});

test("lookups return scoped, formatted rows", () => {
  const lost = a.TOOLS.search_queries.run(data, { sort: "lost_clicks" });
  assert.equal(lost.rows[0].label, "water heater repair");
  assert.deepEqual(lost.rows.map((r) => r.label), ["water heater repair"], "only queries that actually lost clicks");
  const geo = a.TOOLS.geography.run(data, { level: "country" });
  assert.deepEqual(geo.rows[0].values, ["700", "28.0%", "0"]);
});
