import type { IntelligenceMemorySnapshot } from "@/lib/intelligence/memory-snapshot-contracts";

export async function listIntelligenceMemorySnapshots(
  projectId: string
): Promise<IntelligenceMemorySnapshot[]> {
  return [
    {
      id: `memory-${projectId}-baseline`,
      projectId,
      createdAt: new Date().toISOString(),
      headline: "Initial intelligence memory scaffold",
      summary:
        "Persistent memory is prepared, but evidence-backed project snapshots have not yet been written.",
      categories: ["overview", "seo", "behavior", "cross-source"],
      confidence: "low",
    },
  ];
}