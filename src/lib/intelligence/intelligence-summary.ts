import { collectProjectEvidence } from "@/lib/intelligence/evidence-collector";
import { summarizeMissingData } from "@/lib/intelligence/missing-data-evaluator";
import { buildIntelligenceActions } from "@/lib/intelligence/action-generator";
import type { IntelligenceSummary } from "@/lib/intelligence/intelligence-contracts";

export async function buildIntelligenceSummary(
  projectId: string
): Promise<IntelligenceSummary> {
  const collected = await collectProjectEvidence(projectId);

  return {
    projectId,
    headline: "Intelligence summary",
    summary: summarizeMissingData(collected.missingData),
    evidence: collected.evidence,
    missingData: collected.missingData,
    actions: buildIntelligenceActions(collected),
  };
}