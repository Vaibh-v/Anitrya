import type { ProjectDiagnostics } from "@/lib/evidence/types";
import {
  buildHistoryFingerprint,
  type IntelligenceHistoryRecord,
} from "@/lib/intelligence/history-store";

type DiagnosticSection = {
  title: string;
  summary: string;
  confidence: string;
  actions?: string[];
};

type FindingLike = {
  title: string;
  summary: string;
  confidence?: string;
  evidence?: string[];
  nextSteps?: string[];
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function confidenceToScore(confidence: string): number {
  const normalized = confidence.trim().toLowerCase();
  if (normalized === "high") return 85;
  if (normalized === "medium") return 62;
  return 38;
}

function makeSectionRecord(input: {
  workspaceId: string;
  projectSlug: string;
  category: string;
  dateFrom: string | null;
  dateTo: string | null;
  title: string;
  summary: string;
  confidence: string;
  evidence: string[];
  actions: string[];
}): IntelligenceHistoryRecord {
  return {
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    category: input.category,
    title: input.title,
    summary: input.summary,
    confidence: input.confidence,
    score: confidenceToScore(input.confidence),
    evidenceJson: JSON.stringify(input.evidence),
    actionsJson: JSON.stringify(input.actions),
    sourceWindowFrom: input.dateFrom,
    sourceWindowTo: input.dateTo,
    fingerprint: buildHistoryFingerprint({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: input.category,
      title: input.title,
      sourceWindowFrom: input.dateFrom,
      sourceWindowTo: input.dateTo,
    }),
  };
}

function sectionToRecord(input: {
  workspaceId: string;
  projectSlug: string;
  category: "overview" | "seo" | "behavior" | "crossSource";
  section: DiagnosticSection;
  dateFrom: string | null;
  dateTo: string | null;
}): IntelligenceHistoryRecord {
  return makeSectionRecord({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    category: input.category,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    title: normalizeText(input.section.title, input.category),
    summary: normalizeText(
      input.section.summary,
      "No summary is available for this diagnostic section yet."
    ),
    confidence: normalizeText(input.section.confidence, "low").toLowerCase(),
    evidence: [
      `Section summary: ${normalizeText(input.section.summary, "No summary available.")}`,
    ],
    actions: asArray<string>(input.section.actions).map((item) =>
      normalizeText(item, "No action detail provided.")
    ),
  });
}

function findingsToRecords(input: {
  workspaceId: string;
  projectSlug: string;
  category: "seo" | "behavior" | "crossSource";
  findings: FindingLike[];
  dateFrom: string | null;
  dateTo: string | null;
}): IntelligenceHistoryRecord[] {
  return input.findings.map((finding) =>
    makeSectionRecord({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: input.category,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      title: normalizeText(finding.title, `${input.category} finding`),
      summary: normalizeText(
        finding.summary,
        "No summary is available for this finding yet."
      ),
      confidence: normalizeText(finding.confidence, "low").toLowerCase(),
      evidence: asArray<string>(finding.evidence).map((item) =>
        normalizeText(item, "No evidence detail provided.")
      ),
      actions: asArray<string>(finding.nextSteps).map((item) =>
        normalizeText(item, "No next step provided.")
      ),
    })
  );
}

export function buildHistoryRecordsFromDiagnostics(input: {
  workspaceId: string;
  projectSlug: string;
  diagnostics: ProjectDiagnostics;
  dateFrom?: string | null;
  dateTo?: string | null;
}): IntelligenceHistoryRecord[] {
  const records: IntelligenceHistoryRecord[] = [];

  records.push(
    sectionToRecord({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "overview",
      section: input.diagnostics.overview,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    sectionToRecord({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "seo",
      section: input.diagnostics.seo,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    sectionToRecord({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "behavior",
      section: input.diagnostics.behavior,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    sectionToRecord({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "crossSource",
      section: input.diagnostics.crossSource,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    ...findingsToRecords({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "seo",
      findings: asArray<FindingLike>(input.diagnostics.seoFindings),
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    ...findingsToRecords({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "behavior",
      findings: asArray<FindingLike>(input.diagnostics.behaviorFindings),
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  records.push(
    ...findingsToRecords({
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      category: "crossSource",
      findings: asArray<FindingLike>(input.diagnostics.crossSourceFindings),
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    })
  );

  return records;
}