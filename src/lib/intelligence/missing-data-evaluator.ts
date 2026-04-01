import type { IntelligenceMissingData } from "@/lib/intelligence/intelligence-contracts";

export function summarizeMissingData(
  missingData: IntelligenceMissingData[]
): string {
  if (missingData.length === 0) {
    return "No material missing-data gaps detected.";
  }

  if (missingData.length === 1) {
    return `${missingData[0].source} is currently incomplete.`;
  }

  return `${missingData.length} evidence sources are currently incomplete, so interpretation should remain cautious.`;
}