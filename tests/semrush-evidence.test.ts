import { describe, expect, it } from "vitest";
import {
  normalizeDomainOrganic,
  normalizeDomainRanks,
  normalizeSemrushDatabase,
  normalizeSemrushDomain,
  parseSemrushReport,
  resolveSemrushKeywordLimit,
} from "../src/lib/integrations/semrush/semrush-normalizer";
import { buildSemrushExportDataset } from "../src/lib/integrations/semrush/semrush-export-format";
import { buildSemrushIntelligenceEvidence } from "../src/lib/intelligence/future-evidence/semrush";

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

const RANKS_BODY = [
  "Database;Domain;Rank;Organic Keywords;Organic Traffic;Organic Cost;Adwords Keywords;Adwords Traffic;Adwords Cost",
  "us;example.com;15432;1240;8800;5321.5;0;0;0",
].join("\n");

const ORGANIC_BODY = [
  "Keyword;Position;Previous Position;Search Volume;CPC;Url;Traffic (%);Traffic Cost (%);Competition",
  "acme widgets;3;5;1900;1.25;https://example.com/widgets;12.5;10.1;0.44",
  "buy widget;8;0;720;;https://example.com/buy;4.2;3.3;0.81",
].join("\n");

describe("SEMrush normalizer", () => {
  it("normalizes domains and database codes", () => {
    expect(normalizeSemrushDomain("https://www.Example.com/path?q=1")).toBe("example.com");
    expect(normalizeSemrushDomain("sc-domain:example.co.uk")).toBe("example.co.uk");
    expect(normalizeSemrushDomain("not a domain")).toBeNull();
    expect(normalizeSemrushDatabase(undefined)).toBe("us");
    expect(normalizeSemrushDatabase("UK")).toBe("uk");
    expect(normalizeSemrushDatabase("us; drop")).toBeNull();
  });

  it("clamps the keyword limit", () => {
    expect(resolveSemrushKeywordLimit(undefined)).toBe(100);
    expect(resolveSemrushKeywordLimit("25")).toBe(25);
    expect(resolveSemrushKeywordLimit("999999")).toBe(1000);
  });

  it("classifies SEMrush error bodies", () => {
    expect(parseSemrushReport("ERROR 50 :: NOTHING FOUND").status).toBe("not_found");

    const wrongKey = parseSemrushReport("ERROR 120 :: WRONG KEY - ID PAIR");
    expect(wrongKey.status).toBe("error");
    if (wrongKey.status === "error") expect(wrongKey.message).toMatch(/Reconnect SEMrush/);

    const units = parseSemrushReport("ERROR 132 :: API UNITS BALANCE IS ZERO");
    expect(units.status).toBe("error");
  });

  it("normalizes domain_ranks without inventing zeros for missing values", () => {
    const parsed = parseSemrushReport(RANKS_BODY);
    expect(parsed.status).toBe("ok");
    if (parsed.status !== "ok") return;

    const rows = normalizeDomainRanks(parsed.rows, context);
    const byMetric = Object.fromEntries(rows.map((r) => [r.metric, r]));

    expect(byMetric.organic_keywords?.value).toBe(1240);
    expect(byMetric.organic_traffic?.confidence).toBe("low");
    expect(byMetric.organic_traffic?.isEstimate).toBe(true);
    expect(rows.every((r) => r.projectSlug === "acme" && r.source === "semrush")).toBe(true);
  });

  it("normalizes domain_organic and flags truncated samples as partial", () => {
    const parsed = parseSemrushReport(ORGANIC_BODY);
    if (parsed.status !== "ok") throw new Error("expected ok");

    const full = normalizeDomainOrganic(parsed.rows, { ...context, limit: 100 });
    expect(full.every((r) => r.availability === "available")).toBe(true);
    // Empty CPC for "buy widget" must be dropped, not stored as 0.
    expect(full.find((r) => r.keyword === "buy widget" && r.metric === "cpc")).toBeUndefined();
    expect(full.find((r) => r.keyword === "acme widgets" && r.metric === "position")?.value).toBe(3);

    const truncated = normalizeDomainOrganic(parsed.rows, { ...context, limit: 2 });
    expect(truncated.every((r) => r.availability === "partial")).toBe(true);
  });
});

describe("SEMrush export + intelligence adapters", () => {
  const ranks = parseSemrushReport(RANKS_BODY);
  const organic = parseSemrushReport(ORGANIC_BODY);
  const rows =
    ranks.status === "ok" && organic.status === "ok"
      ? [
          ...normalizeDomainRanks(ranks.rows, context),
          ...normalizeDomainOrganic(organic.rows, { ...context, limit: 100 }),
        ]
      : [];

  it("returns no export dataset when there is no data", () => {
    expect(buildSemrushExportDataset([])).toBeNull();
  });

  it("builds a stable export dataset with optional prefix columns", () => {
    const dataset = buildSemrushExportDataset(rows, { prefix: { workspace_id: "ws_1" } });
    expect(dataset?.title).toBe("semrush_evidence");
    expect(dataset?.header[0]).toBe("workspace_id");
    expect(dataset?.header).toContain("confidence");
    expect(dataset?.rows.length).toBe(rows.length);
    expect(dataset?.rows.every((row) => row.length === dataset.header.length)).toBe(true);
  });

  it("builds an intelligence evidence input without reasoning", () => {
    const evidence = buildSemrushIntelligenceEvidence(rows);
    expect(evidence.coverage.state).toBe("connected");
    expect(evidence.coverage.domain).toBe("example.com");
    expect(evidence.keywordRows).toHaveLength(2);

    const top = evidence.keywordRows[0];
    expect(top?.keyword).toBe("acme widgets");
    expect(top?.positionChange).toBe(2);
    // previous position 0 = not ranking before; no change is claimed.
    expect(evidence.keywordRows[1]?.positionChange).toBeNull();
    expect(evidence.coverage.caveats.join(" ")).toMatch(/estimates/);

    expect(buildSemrushIntelligenceEvidence([]).coverage.state).toBe("missing");
  });
});
