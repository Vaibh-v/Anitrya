/**
 * SEMrush Analytics API v3 client — server-side only.
 *
 * The API key is passed in by the caller (decrypted from IntegrationToken on
 * the server). It is never logged and never included in thrown messages.
 */
import {
  SEMRUSH_API_BASE_URL,
  SEMRUSH_DOMAIN_ORGANIC_COLUMNS,
  SEMRUSH_DOMAIN_RANKS_COLUMNS,
  type SemrushReportParseResult,
  type SemrushReportType,
} from "@/lib/integrations/semrush/semrush-evidence-contract";
import { parseSemrushReport } from "@/lib/integrations/semrush/semrush-normalizer";

const REQUEST_TIMEOUT_MS = 20_000;

if (typeof window !== "undefined") {
  throw new Error("semrush-client must only be imported on the server.");
}

export type SemrushReportRequest = {
  apiKey: string;
  type: SemrushReportType;
  domain: string;
  databaseCode: string;
  limit?: number;
};

function buildUrl(request: SemrushReportRequest) {
  const url = new URL(SEMRUSH_API_BASE_URL);
  const columns =
    request.type === "domain_ranks"
      ? SEMRUSH_DOMAIN_RANKS_COLUMNS
      : SEMRUSH_DOMAIN_ORGANIC_COLUMNS;

  url.searchParams.set("type", request.type);
  url.searchParams.set("key", request.apiKey);
  url.searchParams.set("domain", request.domain);
  url.searchParams.set("database", request.databaseCode);
  url.searchParams.set("export_columns", columns.map((c) => c.column).join(","));

  if (request.type === "domain_organic") {
    url.searchParams.set("display_limit", String(request.limit ?? 100));
    url.searchParams.set("display_sort", "tr_desc");
  }

  return url;
}

export async function fetchSemrushReport(
  request: SemrushReportRequest,
): Promise<SemrushReportParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(request), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });

    const body = await response.text();
    const parsed = parseSemrushReport(body);

    // SEMrush usually answers 200 with an "ERROR ..." body; a non-2xx without
    // a parseable error is still surfaced as an error.
    if (!response.ok && parsed.status === "ok") {
      return {
        status: "error",
        code: String(response.status),
        message: `SEMrush ${request.type} request failed with HTTP ${response.status}.`,
      };
    }

    return parsed;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";

    return {
      status: "error",
      code: aborted ? "timeout" : "network",
      message: aborted
        ? `SEMrush ${request.type} request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
        : `SEMrush ${request.type} request failed before a response was received.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
