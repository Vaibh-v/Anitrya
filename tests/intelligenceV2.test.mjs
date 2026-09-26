import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const d = await import("../src/lib/intelligence/v2/detectors.ts");
const { buildWindow } = await import("../src/lib/intelligence/v2/window.ts");

const q = (label, curClicks, curImpr, curPos, prevClicks = 0, prevImpr = 0, prevPos = 0) => ({ label, curClicks, curImpr, curPos, prevClicks, prevImpr, prevPos });
const base = (over = {}) => ({
  agg: {
    window: buildWindow("2026-08-28", "2026-09-26"),
    sources: [], landings: [], queries: [], pages: [], dailySessions: [], dailyClicks: [],
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
