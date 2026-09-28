import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const d = await import("../src/lib/intelligence/v2/detectors.ts");
const { buildWindow } = await import("../src/lib/intelligence/v2/window.ts");

const q = (label, curClicks, curImpr, curPos, prevClicks = 0, prevImpr = 0, prevPos = 0) => ({ label, curClicks, curImpr, curPos, prevClicks, prevImpr, prevPos });
const base = (over = {}) => ({
  agg: {
    window: buildWindow("2026-08-28", "2026-09-26"),
    sources: [], landings: [], queries: [], pages: [], dailySessions: [], dailyClicks: [], countries: [], season: null,
    coverage: { ga4CurDays: 30, ga4PrevDays: 30, gscCurDays: 30, gscPrevDays: 30 },
    ...over,
  },
  brandTokens: ["owens"],
  hostCore: "johnowensservices",
});

test("previous window has the same length and ends the day before", () => {
  assert.deepEqual(buildWindow("2026-08-28", "2026-09-26"), { from: "2026-08-28", to: "2026-09-26", prevFrom: "2026-07-29", prevTo: "2026-08-27", days: 30 });
});

test("expected CTR falls with position and spam queries are recognised", () => {
  assert.ok(d.expectedCtr(1) > d.expectedCtr(3) && d.expectedCtr(3) > d.expectedCtr(10) && d.expectedCtr(10) > d.expectedCtr(15));
  assert.ok(d.isSpamQuery("98win") && d.isSpamQuery("bom88 casino") && !d.isSpamQuery("water heater repair"));
});

test("brand queries match the domain core or name tokens", () => {
  const ctx = base();
  assert.ok(d.isBrandQuery("john owens services", ctx));
  assert.ok(d.isBrandQuery("owens plumbing", ctx));
  assert.ok(!d.isBrandQuery("plumber petaluma", ctx));
});

test("spam never leaks into CTR findings and is reported on its own", () => {
  const ctx = base({ queries: [q("98win", 0, 9000, 9), q("hvac marin", 2, 2400, 3.2), q("john owens services", 240, 900, 1.2)] });
  const gap = d.ctrGap(ctx);
  assert.ok(gap && gap.rows.every((r) => r.label !== "98win"));
  const spam = d.spamSignal(ctx);
  assert.ok(spam && spam.rows[0].label === "98win");
});

test("comparison detectors stay silent without previous-period data", () => {
  const ctx = base({ coverage: { ga4CurDays: 30, ga4PrevDays: 0, gscCurDays: 30, gscPrevDays: 0 }, queries: [q("hvac", 0, 500, 14, 90, 500, 4)] });
  assert.equal(d.rankingMovers(ctx), null);
  assert.equal(d.trafficChange(ctx), null);
});

test("traffic change is decomposed by the sources that moved", () => {
  const ctx = base({ sources: [
    { label: "google / organic", cur: 300, prev: 600, curEngaged: 0, curConv: 0, prevConv: 0 },
    { label: "(direct)", cur: 500, prev: 510, curEngaged: 0, curConv: 0, prevConv: 0 },
  ] });
  const f = d.trafficChange(ctx);
  assert.ok(f && f.title.includes("down") && f.rows[0].label === "google / organic");
});

test("non-converting traffic outside the home market is flagged as likely bots", () => {
  const c = (id, name, cur, curConv, prevConv = 0) => ({ id, name, cur, prev: 0, curConv, prevConv });
  const f = d.botTraffic(base({ countries: [c("US", "United States", 1419, 20, 18), c("SG", "Singapore", 703, 0), c("CN", "China", 176, 0), c("CA", "Canada", 20, 0)] }));
  assert.ok(f, "finding expected");
  assert.equal(f.category, "bot_traffic");
  assert.match(f.title, /Singapore, China/);
  assert.equal(f.impact, 879, "Canada is below the volume floor");
  assert.ok(f.comparison.current > f.comparison.previous, "clean conversion rate is higher");
  assert.equal(d.botTraffic(base({ countries: [c("US", "United States", 900, 10), c("CA", "Canada", 60, 1)] })), null, "a converting neighbour is not bots");
});

test("seasonal demand: last year's coming month drives a prepare-now finding", () => {
  const s = (label, thisLy, nextLy, thisNow = 0) => ({ label, thisLy, nextLy, thisNow });
  const season = { thisMonth: "September", nextMonth: "October", thisLyKey: "2025-09", nextLyKey: "2025-10",
    queries: [s("furnace repair", 120, 610, 140), s("heater not working", 60, 300), s("boiler service", 80, 190), s("water heater repair", 400, 380), s("john owens services", 900, 950)] };
  const f = d.seasonalDemand(base({ season }));
  assert.ok(f && f.category === "seasonal_demand");
  assert.match(f.title, /October last year/);
  assert.equal(f.rows[0].label, "furnace repair");
  assert.ok(f.rows.every((r) => r.label !== "john owens services"), "brand demand is excluded");
});

