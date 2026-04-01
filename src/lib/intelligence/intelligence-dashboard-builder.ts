import type { IntelligenceDashboardPayload } from "@/lib/intelligence/intelligence-dashboard-contracts";
import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import { listIntelligenceMemorySnapshots } from "@/lib/intelligence/memory-snapshot-store";

export async function buildIntelligenceDashboardPayload(
  projectId: string
): Promise<IntelligenceDashboardPayload> {
  const summary = await buildIntelligenceSummary(projectId);
  const memory = await listIntelligenceMemorySnapshots(projectId);

  return {
    headline: "Operational intelligence status",
    projectId,
    summary: summary.summary,
    stats: [
      {
        label: "Evidence points",
        value: summary.evidence.length,
        context: "Structured evidence points currently available to the reasoning layer.",
      },
      {
        label: "Missing sources",
        value: summary.missingData.length,
        context: "Evidence layers that still need hydration before confidence can rise.",
      },
      {
        label: "Next actions",
        value: summary.actions.length,
        context: "Action groups currently generated from the active project context.",
      },
      {
        label: "Memory snapshots",
        value: memory.length,
        context: "Persisted intelligence memory entries currently available.",
      },
    ],
    actions: summary.actions,
    memoryCount: memory.length,
  };
}