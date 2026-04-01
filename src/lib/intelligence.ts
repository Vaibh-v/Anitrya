import type { ProjectIntelligenceResponse } from "@/lib/evidence/types";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { buildHistoryRecordsFromDiagnostics } from "@/lib/intelligence/history-snapshot";
import { insertIntelligenceHistoryRecord } from "@/lib/intelligence/history-store";
import { loadProjectData } from "@/lib/intelligence/repository";
import { getProjectDiagnostics } from "@/lib/project-diagnostics";

type LooseRecord = Record<string, unknown>;
type ResolvedDateRange = ReturnType<typeof resolveDateRange>;

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? (value as LooseRecord) : {};
}

function pickArray<T = unknown>(source: LooseRecord, keys: string[]): T[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

function buildEmptyResponse(): ProjectIntelligenceResponse {
  return {
    project: null,
    evidence: {
      coverage: {},
      cards: [],
      overviewTrendSeries: [],
      seoTrendSeries: [],
      behaviorTrendSeries: [],
      overviewTable: [],
      seoTable: [],
      behaviorTable: [],
      gscQueryRows: [],
      gscPageRows: [],
      ga4LandingRows: [],
      ga4SourceRows: [],
    } as any,
    diagnostics: {
      overview: {
        title: "Overview",
        summary: "No project intelligence is available yet.",
        confidence: "low",
        actions: ["Select a valid project and sync evidence to populate intelligence."],
      },
      seo: {
        title: "SEO",
        summary: "No SEO intelligence is available yet.",
        confidence: "low",
        actions: ["Sync GSC evidence to populate search intelligence."],
      },
      behavior: {
        title: "Behavior",
        summary: "No behavior intelligence is available yet.",
        confidence: "low",
        actions: ["Sync GA4 evidence to populate behavior intelligence."],
      },
      crossSource: {
        title: "Cross-source",
        summary: "No cross-source intelligence is available yet.",
        confidence: "low",
        actions: ["Sync both GA4 and GSC evidence to unlock cross-source reasoning."],
      },
      seoFindings: [],
      behaviorFindings: [],
      crossSourceFindings: [],
    },
  } as unknown as ProjectIntelligenceResponse;
}

async function persistDiagnosticsHistory(input: {
  workspaceId?: string | null;
  projectSlug?: string | null;
  diagnostics: ProjectIntelligenceResponse["diagnostics"];
  dateRange: ResolvedDateRange;
}) {
  const workspaceId = normalize(input.workspaceId);
  const projectSlug = normalize(input.projectSlug);

  if (!workspaceId || !projectSlug) return;

  try {
    const records = buildHistoryRecordsFromDiagnostics({
      workspaceId,
      projectSlug,
      diagnostics: input.diagnostics as any,
      dateFrom: input.dateRange.from,
      dateTo: input.dateRange.to,
    });

    await Promise.allSettled(
      records.map((record) => insertIntelligenceHistoryRecord(record))
    );
  } catch (error) {
    console.error("INTELLIGENCE_HISTORY_PERSIST_FAILED", error);
  }
}

function buildResponseFromBundle(bundleInput: unknown): ProjectIntelligenceResponse {
  const bundle = asRecord(bundleInput);

  const cards = pickArray(bundle, ["overviewCards", "cards"]);
  const overviewTrendSeries = pickArray(bundle, ["overviewTrendSeries", "overviewTrend"]);
  const seoTrendSeries = pickArray(bundle, ["seoTrendSeries", "seoTrend"]);
  const behaviorTrendSeries = pickArray(bundle, ["behaviorTrendSeries", "behaviorTrend"]);

  const overviewTable = pickArray(bundle, ["overviewTable"]);
  const seoTable = pickArray(bundle, ["seoTable"]);
  const behaviorTable = pickArray(bundle, ["behaviorTable"]);

  const gscQueryRows = pickArray(bundle, ["gscQueryRows", "gscQueries"]);
  const gscPageRows = pickArray(bundle, ["gscPageRows", "gscPages"]);
  const ga4LandingRows = pickArray(bundle, [
    "ga4LandingRows",
    "ga4LandingPages",
    "ga4Landings",
  ]);
  const ga4SourceRows = pickArray(bundle, ["ga4SourceRows", "ga4Sources"]);

  const diagnostics = getProjectDiagnostics({
    overviewTable,
    seoTable,
    behaviorTable,
    gscQueryRows,
    gscPageRows,
    ga4LandingRows,
    ga4SourceRows,
  } as never);

  return {
    project: (bundle.project ?? null) as any,
    evidence: {
      coverage: asRecord(bundle.coverage),
      cards,
      overviewTrendSeries,
      seoTrendSeries,
      behaviorTrendSeries,
      overviewTable,
      seoTable,
      behaviorTable,
      gscQueryRows,
      gscPageRows,
      ga4LandingRows,
      ga4SourceRows,
    } as any,
    diagnostics,
  } as unknown as ProjectIntelligenceResponse;
}

async function getBundle(input: {
  workspaceId?: string | null;
  projectSlug?: string | null;
  dateRange: ResolvedDateRange;
}) {
  const projectSlug = normalize(input.projectSlug);
  if (!projectSlug) return null;

  return loadProjectData({
    workspaceId: input.workspaceId ?? undefined,
    projectSlug,
    dateRange: input.dateRange,
  });
}

export async function getProjectIntelligence(
  input:
    | string
    | {
        workspaceId?: unknown;
        projectSlug?: unknown;
        preset?: unknown;
        from?: unknown;
        to?: unknown;
        dateRange?: ResolvedDateRange;
      }
): Promise<ProjectIntelligenceResponse> {
  if (typeof input === "string") {
    const dateRange = resolveDateRange({});
    const bundle = await getBundle({
      projectSlug: input,
      dateRange,
    });

    const response = bundle ? buildResponseFromBundle(bundle) : buildEmptyResponse();

    await persistDiagnosticsHistory({
      workspaceId: normalize((response.project as any)?.workspaceId),
      projectSlug: normalize((response.project as any)?.slug) ?? input,
      diagnostics: response.diagnostics,
      dateRange,
    });

    return response;
  }

  const workspaceId = normalize(input.workspaceId);
  const projectSlug = normalize(input.projectSlug);

  const dateRange =
    input.dateRange ??
    resolveDateRange({
      preset: typeof input.preset === "string" ? input.preset : undefined,
      from: typeof input.from === "string" ? input.from : undefined,
      to: typeof input.to === "string" ? input.to : undefined,
    });

  const bundle = await getBundle({
    workspaceId,
    projectSlug,
    dateRange,
  });

  const response = bundle ? buildResponseFromBundle(bundle) : buildEmptyResponse();

  await persistDiagnosticsHistory({
    workspaceId: workspaceId ?? normalize((response.project as any)?.workspaceId),
    projectSlug: projectSlug ?? normalize((response.project as any)?.slug),
    diagnostics: response.diagnostics,
    dateRange,
  });

  return response;
}

export async function getProjectIntelligenceForRange(input: {
  workspaceId?: unknown;
  projectSlug?: unknown;
  preset?: unknown;
  from?: unknown;
  to?: unknown;
}): Promise<ProjectIntelligenceResponse> {
  return getProjectIntelligence(input);
}