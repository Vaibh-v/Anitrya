import type {
  IntelligenceEvidencePoint,
  IntelligenceMissingData,
} from "@/lib/intelligence/intelligence-contracts";

export type CollectedEvidenceResult = {
  evidence: IntelligenceEvidencePoint[];
  missingData: IntelligenceMissingData[];
};

export async function collectProjectEvidence(
  projectId: string
): Promise<CollectedEvidenceResult> {
  const evidence: IntelligenceEvidencePoint[] = [
    {
      source: "project",
      metric: "project_id",
      value: projectId,
      note: "Project context resolved successfully.",
    },
  ];

  const missingData: IntelligenceMissingData[] = [
    {
      source: "overview",
      reason: "Overview diagnostics have not yet been hydrated into the summary collector.",
    },
    {
      source: "seo",
      reason: "SEO diagnostics have not yet been hydrated into the summary collector.",
    },
    {
      source: "behavior",
      reason: "Behavior diagnostics have not yet been hydrated into the summary collector.",
    },
  ];

  return {
    evidence,
    missingData,
  };
}