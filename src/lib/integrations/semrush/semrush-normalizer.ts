/**
 * SEMrush normalizer — pure functions only (no prisma, no fetch, no env reads
 * except through explicit arguments) so it is independently unit-testable.
 */
import {
  SEMRUSH_DEFAULT_DATABASE,
  SEMRUSH_DEFAULT_KEYWORD_LIMIT,
  SEMRUSH_DOMAIN_ORGANIC_COLUMNS,
  SEMRUSH_DOMAIN_RANKS_COLUMNS,
  SEMRUSH_MAX_KEYWORD_LIMIT,
  SEMRUSH_PROVIDER_KEY,
  SEMRUSH_SOURCE_VERSION,
  type SemrushEvidenceRow,
  type SemrushReportParseResult,
} from "./semrush-evidence-contract";

/**
 * Normalize user/GSC input into a bare SEMrush domain.
 *   "https://www.Example.com/path?x" -> "example.com"
 *   "sc-domain:example.com"          -> "example.com"
 * Returns null when the input does not look like a hostname.
 */
export function normalizeSemrushDomain(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;

  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^sc-domain:/, "");
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/:\d+$/, "");
  value = value.replace(/^www\./, "");
  value = value.replace(/\.$/, "");

  if (!/^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) {
    return null;
  }

  return value;
}

/** SEMrush database codes are short lowercase identifiers ("us", "uk", "mobile-us"). */
export function normalizeSemrushDatabase(input: string | null | undefined): string | null {
  if (input == null || (typeof input === "string" && input.trim() === "")) {
    return SEMRUSH_DEFAULT_DATABASE;
  }

  if (typeof input !== "string") return null;

  const value = input.trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z]{2,4})?$|^mobile-[a-z]{2,3}$/.test(value) ? value : null;
}

export function resolveSemrushKeywordLimit(raw: string | null | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return SEMRUSH_DEFAULT_KEYWORD_LIMIT;
  return Math.min(parsed, SEMRUSH_MAX_KEYWORD_LIMIT);
}

/**
 * Parse a SEMrush Analytics API v3 response body.
 * Success: ';'-delimited CSV with a header row.
 * Failure: plain text "ERROR <code> :: <MESSAGE>". Code 50 = NOTHING FOUND.
 */
export function parseSemrushReport(body: string): SemrushReportParseResult {
  const text = (body ?? "").replace(/^﻿/, "").trim();

  const errorMatch = text.match(/^ERROR\s+(\d+)\s*::\s*(.+)$/im);
  if (errorMatch && text.toUpperCase().startsWith("ERROR")) {
    const code = errorMatch[1] ?? "unknown";
    const message = (errorMatch[2] ?? "").trim();

    if (code === "50" || /NOTHING FOUND/i.test(message)) {
      return { status: "not_found", code, message };
    }

    return { status: "error", code, message: describeSemrushError(code, message) };
  }

  if (!text) {
    return { status: "not_found", code: "empty", message: "Empty response body." };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = splitSemrushLine(lines[0] ?? "");
  const rows = lines.slice(1).map(splitSemrushLine);

  if (header.length === 0) {
    return { status: "error", code: "parse", message: "SEMrush response had no header row." };
  }

  return { status: "ok", header, rows };
}

function splitSemrushLine(line: string): string[] {
  // SEMrush v3 CSV uses ';' and does not quote fields in practice; still
  // tolerate simple double-quoted fields.
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ";" && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

/** Human-readable blocker for common SEMrush error codes (never echoes the key). */
export function describeSemrushError(code: string, message: string): string {
  const upper = message.toUpperCase();

  if (upper.includes("WRONG KEY") || code === "120" || code === "121") {
    return "SEMrush rejected the stored API key. Reconnect SEMrush with a valid key.";
  }

  if (upper.includes("UNITS BALANCE") || code === "132" || code === "133") {
    return "SEMrush API units balance is exhausted for this key.";
  }

  if (upper.includes("LIMIT") || code === "134" || code === "135") {
    return `SEMrush rate/plan limit reached (${message}).`;
  }

  if (upper.includes("DATABASE")) {
    return `SEMrush rejected the database code (${message}).`;
  }

  return `SEMrush API error ${code}: ${message}`;
}

function toNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned.toLowerCase() === "n/a") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

type NormalizeContext = {
  workspaceId: string;
  projectSlug: string;
  domain: string;
  databaseCode: string;
  snapshotDate: string;
  windowFrom: string;
  windowTo: string;
  fetchedAt: string;
};

function baseRow(context: NormalizeContext) {
  return {
    workspaceId: context.workspaceId,
    projectSlug: context.projectSlug,
    date: context.snapshotDate,
    windowFrom: context.windowFrom,
    windowTo: context.windowTo,
    domain: context.domain,
    databaseCode: context.databaseCode,
    source: SEMRUSH_PROVIDER_KEY,
    sourceVersion: SEMRUSH_SOURCE_VERSION,
    fetchedAt: context.fetchedAt,
  } as const;
}

/** domain_ranks -> one row per domain-level metric. Null values are dropped (no fake zeros). */
export function normalizeDomainRanks(
  rows: string[][],
  context: NormalizeContext,
): SemrushEvidenceRow[] {
  const first = rows[0];
  if (!first) return [];

  const output: SemrushEvidenceRow[] = [];

  SEMRUSH_DOMAIN_RANKS_COLUMNS.forEach((definition, index) => {
    if (!definition.metric) return;

    const value = toNumber(first[index]);
    if (value === null) return;

    output.push({
      ...baseRow(context),
      reportType: "domain_ranks",
      entityType: "domain",
      keyword: null,
      pageUrl: null,
      metric: definition.metric,
      value,
      availability: "available",
      confidence: definition.confidence ?? "medium",
      isEstimate: definition.isEstimate ?? true,
    });
  });

  return output;
}

/**
 * domain_organic -> one row per (keyword, url, metric).
 * When SEMrush returned exactly `limit` rows the sample is a truncated top-N,
 * so rows are marked availability = "partial".
 */
export function normalizeDomainOrganic(
  rows: string[][],
  context: NormalizeContext & { limit: number },
): SemrushEvidenceRow[] {
  const truncated = rows.length >= context.limit;
  const keywordIndex = SEMRUSH_DOMAIN_ORGANIC_COLUMNS.findIndex((c) => c.role === "keyword");
  const urlIndex = SEMRUSH_DOMAIN_ORGANIC_COLUMNS.findIndex((c) => c.role === "url");
  const output: SemrushEvidenceRow[] = [];

  for (const row of rows) {
    const keyword = (row[keywordIndex] ?? "").trim();
    if (!keyword) continue;

    const pageUrl = (row[urlIndex] ?? "").trim() || null;

    SEMRUSH_DOMAIN_ORGANIC_COLUMNS.forEach((definition, index) => {
      if (!definition.metric) return;

      const value = toNumber(row[index]);
      if (value === null) return;

      output.push({
        ...baseRow(context),
        reportType: "domain_organic",
        entityType: "keyword",
        keyword,
        pageUrl,
        metric: definition.metric,
        value,
        availability: truncated ? "partial" : "available",
        confidence: definition.confidence ?? "medium",
        isEstimate: definition.isEstimate ?? true,
      });
    });
  }

  return output;
}

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
