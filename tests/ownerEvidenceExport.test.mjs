import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const { EVIDENCE_TABLE_SPECS, mergeProjectRows, resolveMaxRowsPerTab, toSheetRow } =
  await import("../src/lib/export/normalized-evidence-specs.ts");
const { assertIsoDateRange, readGoogleJson } =
  await import("../src/lib/integrations/google/read-google-json.ts");

const header = ["workspace_id", "project_id", "project_slug", "project_label", "date", "metric", "value", "synced_at"];
const identity = { workspace_id: "ws", project_id: "p1", project_slug: "acme", project_label: "Acme" };

test("maps DB rows onto the customer header (identity, db columns, synced_at)", () => {
  const row = toSheetRow(header, { date: "2026-09-01", metric: "CALL_CLICKS", value: 3n }, identity, "2026-09-26T00:00:00Z");
  assert.deepEqual(row, ["ws", "p1", "acme", "Acme", "2026-09-01", "CALL_CLICKS", "3", "2026-09-26T00:00:00Z"]);
});

test("replaces only this project's rows and keeps other projects", () => {
  const existing = [
    header,
    ["ws", "p1", "acme", "Acme", "2026-08-01", "OLD", "1", "x"],
    ["ws", "p2", "other", "Other", "2026-08-01", "KEEP", "9", "x"],
    ["ws2", "p9", "acme", "Acme elsewhere", "2026-08-01", "KEEP2", "9", "x"],
  ];
  const next = [["ws", "p1", "acme", "Acme", "2026-09-01", "NEW", "2", "y"]];
  const merged = mergeProjectRows({ existing, header, workspaceId: "ws", projectSlug: "acme", nextRows: next });
  assert.deepEqual(merged.map((r) => r[5]), ["metric", "KEEP", "KEEP2", "NEW"]);
});

test("a changed tab header starts the tab over rather than misaligning rows", () => {
  const merged = mergeProjectRows({
    existing: [["old_col"], ["junk"]],
    header,
    workspaceId: "ws",
    projectSlug: "acme",
    nextRows: [],
  });
  assert.deepEqual(merged, [header]);
});

test("covers every normalized source tab with project-scoped columns", () => {
  assert.deepEqual(
    EVIDENCE_TABLE_SPECS.map((spec) => spec.tab),
    ["ga4_source_daily", "ga4_landing_page_daily", "gsc_query_daily", "gsc_page_daily", "google_ads_campaign_daily", "gbp_location_daily"],
  );
  assert.equal(resolveMaxRowsPerTab(undefined), 10000);
  assert.equal(resolveMaxRowsPerTab("999999"), 50000);
});

test("Google responses that are not JSON produce explainable errors", async () => {
  await assert.rejects(
    readGoogleJson(new Response("<html>502</html>", { status: 502 }), "Google Ads campaign sync"),
    /non-JSON response \(HTTP 502\)/,
  );
  assert.deepEqual(await readGoogleJson(Response.json({ ok: 1 }), "x"), { ok: 1 });
  assert.throws(() => assertIsoDateRange("2026-09-01' OR 1=1", "2026-09-02", "Ads"), /valid YYYY-MM-DD/);
  assert.throws(() => assertIsoDateRange("2026-09-05", "2026-09-02", "Ads"), /from <= to/);
});
