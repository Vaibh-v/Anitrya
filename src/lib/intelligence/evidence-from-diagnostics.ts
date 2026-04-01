import type { IntelligenceEvidencePoint } from "@/lib/intelligence/intelligence-contracts";

type DiagnosticLike = {
  id?: string;
  title?: string;
  summary?: string;
  confidence?: string;
  score?: number;
  evidence?: string[];
  category?: string;
};

function toEvidencePoint(
  diagnostic: DiagnosticLike,
  index: number
): IntelligenceEvidencePoint[] {
  const points: IntelligenceEvidencePoint[] = [];

  points.push({
    source: diagnostic.category ?? "diagnostic",
    metric: "title",
    value: diagnostic.title ?? `diagnostic_${index + 1}`,
    note: diagnostic.summary ?? "No summary attached.",
  });

  if (typeof diagnostic.score === "number") {
    points.push({
      source: diagnostic.category ?? "diagnostic",
      metric: "score",
      value: diagnostic.score,
      note: diagnostic.title ?? "Diagnostic score",
    });
  }

  if (typeof diagnostic.confidence === "string") {
    points.push({
      source: diagnostic.category ?? "diagnostic",
      metric: "confidence",
      value: diagnostic.confidence,
      note: diagnostic.title ?? "Diagnostic confidence",
    });
  }

  const evidence = Array.isArray(diagnostic.evidence) ? diagnostic.evidence : [];
  for (const item of evidence.slice(0, 3)) {
    points.push({
      source: diagnostic.category ?? "diagnostic",
      metric: "evidence_point",
      value: item,
      note: diagnostic.title ?? "Evidence detail",
    });
  }

  return points;
}

export function extractEvidenceFromDiagnostics(
  diagnostics: DiagnosticLike[]
): IntelligenceEvidencePoint[] {
  return diagnostics.flatMap((diagnostic, index) =>
    toEvidencePoint(diagnostic, index)
  );
}