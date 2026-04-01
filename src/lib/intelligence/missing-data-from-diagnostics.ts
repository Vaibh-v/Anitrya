import type { IntelligenceMissingData } from "@/lib/intelligence/intelligence-contracts";

type DiagnosticGroups = {
  overview?: unknown[];
  seo?: unknown[];
  behavior?: unknown[];
  crossSource?: unknown[];
};

function isEmptyGroup(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
}

export function inferMissingDataFromDiagnostics(
  groups: DiagnosticGroups
): IntelligenceMissingData[] {
  const missing: IntelligenceMissingData[] = [];

  if (isEmptyGroup(groups.overview)) {
    missing.push({
      source: "overview",
      reason: "Overview diagnostics are still empty for the active project.",
    });
  }

  if (isEmptyGroup(groups.seo)) {
    missing.push({
      source: "seo",
      reason: "SEO diagnostics are still empty for the active project.",
    });
  }

  if (isEmptyGroup(groups.behavior)) {
    missing.push({
      source: "behavior",
      reason: "Behavior diagnostics are still empty for the active project.",
    });
  }

  if (isEmptyGroup(groups.crossSource)) {
    missing.push({
      source: "cross_source",
      reason: "Cross-source diagnostics are still empty for the active project.",
    });
  }

  return missing;
}