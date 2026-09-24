import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGbpPerformanceUrl } from "../src/lib/integrations/google/gbp/performance-request.ts";

test("builds the GBP performance REST request with dailyRange fields", () => {
  const url = new URL(buildGbpPerformanceUrl({
    locationName: "locations/123",
    from: "2026-09-01",
    to: "2026-09-10",
    metrics: ["CALL_CLICKS", "WEBSITE_CLICKS"],
  }));

  assert.equal(url.pathname, "/v1/locations/123:fetchMultiDailyMetricsTimeSeries");
  assert.deepEqual(url.searchParams.getAll("dailyMetrics"), ["CALL_CLICKS", "WEBSITE_CLICKS"]);
  assert.equal(url.searchParams.get("dailyRange.start_date.year"), "2026");
  assert.equal(url.searchParams.get("dailyRange.start_date.month"), "9");
  assert.equal(url.searchParams.get("dailyRange.end_date.day"), "10");
  assert.equal(url.searchParams.has("daily_range.start_date.year"), false);
});
