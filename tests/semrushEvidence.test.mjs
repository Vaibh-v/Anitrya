import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const {
  normalizeDomainOrganic,
  normalizeDomainRanks,
  normalizeSemrushDatabase,
  normalizeSemrushDomain,
  parseSemrushReport,
  resolveSemrushKeywordLimit,
} = await import("../src/lib/integrations/semrush/semrush-normalizer.ts");
const { buildSemrushExportDataset } = await import("../src/lib/integrations/semrush/semrush-export-format.ts");
const { buildSemrushIntelligenceEvidence } = await import("../src/lib/intelligence/future-evidence/semrush.ts");

const context = {
  workspaceId: "ws_1",
  projectSlug: "acme",
  domain: "example.com",
  databaseCode: "us",
  snapshotDate: "2026-09-23",
  windowFrom: "2026-09-01",
  windowTo: "2026-09-22",
  fetchedAt: "2026-09-23T10:00:00.000Z",
};

const RANKS = "Database;Domain;Rank;Organic Keywords;Organic Traffic;Organic Cost;Adwords Keywords;Adwords Traffic;Adwords Cost\nus;example.com;15432;1240;8800;5321.5;0;0;0";
const ORGANIC = [
  "Keyword;Position;Previous Position;Search Volume;CPC;Url;Traffic (%);Traffic Cost (%);Competition",
  "acme widgets;3;5;1900;1.25;https://example.com/widgets;12.5;10.1;0.44",
  "buy widget;8;0;720;;https://example.com/buy;4.2;3.3;0.81",
].join("\n");

function rows() {
  const r = parseSemrushReport(RANKS);
  const o = parseSemrushReport(ORGANIC);
  return [...normalizeDomainRanks(r.rows, context), ...normalizeDomainOrganic(o.rows, { ...context, limit: 100 })];
}

test("normalizes domains, databases and limits", () => {
  assert.equal(normalizeSemrushDomain("https://www.Example.com/path?q=1"), "example.com");
  assert.equal(normalizeSemrushDomain("sc-domain:example.co.uk"), "example.co.uk");
  assert.equal(normalizeSemrushDomain("not a domain"), null);
  assert.equal(normalizeSemrushDatabase(undefined), "us");
  assert.equal(normalizeSemrushDatabase("us; drop"), null);
  assert.equal(resolveSemrushKeywordLimit("999999"), 1000);
});

test("classifies SEMrush error bodies without leaking keys", () => {
  assert.equal(parseSemrushReport("ERROR 50 :: NOTHING FOUND").status, "not_found");
  const wrong = parseSemrushReport("ERROR 120 :: WRONG KEY - ID PAIR");
  assert.equal(wrong.status, "error");
  assert.match(wrong.message, /Reconnect SEMrush/);
});

test("drops missing values instead of storing zeros and flags truncation", () => {
  const all = rows();
  assert.equal(all.find((r) => r.keyword === "buy widget" && r.metric === "cpc"), undefined);
  assert.equal(all.find((r) => r.metric === "organic_traffic").confidence, "low");
  const o = parseSemrushReport(ORGANIC);
  assert.ok(normalizeDomainOrganic(o.rows, { ...context, limit: 2 }).every((r) => r.availability === "partial"));
});

test("export dataset only exists when rows exist", () => {
  assert.equal(buildSemrushExportDataset([]), null);
  const dataset = buildSemrushExportDataset(rows(), { prefix: { workspace_id: "ws_1" } });
  assert.equal(dataset.title, "semrush_evidence");
  assert.ok(dataset.rows.every((row) => row.length === dataset.header.length));
});

test("intelligence input carries caveats and no invented position change", () => {
  const evidence = buildSemrushIntelligenceEvidence(rows());
  assert.equal(evidence.coverage.state, "connected");
  assert.equal(evidence.keywordRows[0].positionChange, 2);
  assert.equal(evidence.keywordRows[1].positionChange, null);
  assert.equal(buildSemrushIntelligenceEvidence([]).coverage.state, "missing");
});
