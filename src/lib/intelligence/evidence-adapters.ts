import type { ProjectEvidence } from "@/lib/evidence/types";

type GenericRow = Record<string, unknown>;

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type LooseEvidence = ProjectEvidence & Record<string, unknown>;

export function getGscQueryRows(evidence: ProjectEvidence | null | undefined): GenericRow[] {
  if (!evidence) return [];
  const source = evidence as LooseEvidence;

  return asArray<GenericRow>(
    source.gscQueryRows ??
      source.gscQueries ??
      source.queryRows ??
      []
  );
}

export function getGscPageRows(evidence: ProjectEvidence | null | undefined): GenericRow[] {
  if (!evidence) return [];
  const source = evidence as LooseEvidence;

  return asArray<GenericRow>(
    source.gscPageRows ??
      source.gscPages ??
      source.pageRows ??
      []
  );
}

export function getGa4LandingRows(
  evidence: ProjectEvidence | null | undefined
): GenericRow[] {
  if (!evidence) return [];
  const source = evidence as LooseEvidence;

  return asArray<GenericRow>(
    source.ga4LandingRows ??
      source.ga4LandingPages ??
      source.ga4Landings ??
      source.landingRows ??
      []
  );
}

export function getGa4SourceRows(
  evidence: ProjectEvidence | null | undefined
): GenericRow[] {
  if (!evidence) return [];
  const source = evidence as LooseEvidence;

  return asArray<GenericRow>(
    source.ga4SourceRows ??
      source.ga4Sources ??
      source.sourceRows ??
      []
  );
}