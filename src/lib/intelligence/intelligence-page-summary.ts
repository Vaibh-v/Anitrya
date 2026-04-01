import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import { listIntelligenceMemorySnapshots } from "@/lib/intelligence/memory-snapshot-store";

export async function buildIntelligencePageSummary(projectId: string) {
  const summary = await buildIntelligenceSummary(projectId);
  const memory = await listIntelligenceMemorySnapshots(projectId);

  return {
    summary,
    memory,
    stats: {
      evidenceCount: summary.evidence.length,
      missingCount: summary.missingData.length,
      actionCount: summary.actions.length,
      memoryCount: memory.length,
    },
  };
}