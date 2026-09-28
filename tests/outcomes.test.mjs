import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const o = await import("../src/lib/intelligence/outcomes-core.ts");

test("each finding is measured on the right table and metric", () => {
  const ev = (table) => [{ table, from: "", to: "", metrics: {} }];
  assert.deepEqual(o.outcomeTarget({ category: "ctr_gap", impactUnit: "clicks", evidence: ev("gsc_query_daily") }).metric, "clicks");
  assert.equal(o.outcomeTarget({ category: "conversion_leak", impactUnit: "conversions", evidence: ev("ga4_source_daily") }).metric, "conversions");
  assert.equal(o.outcomeTarget({ category: "bot_traffic", impactUnit: "sessions", evidence: ev("ga4_geo_daily") }).lowerIsBetter, true);
});

test("track record moves weight gently and defaults to 1", () => {
  assert.equal(o.trustWeight(0, 0), 1);
  assert.equal(o.trustWeight(1, 1), 1.17);
  assert.equal(o.trustWeight(0, 1), 0.83);
  assert.ok(o.trustWeight(9, 10) > 1.3 && o.trustWeight(0, 10) < 0.6);
});
