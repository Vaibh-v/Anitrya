import type {
  IntelligenceRunInput,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";
import { getProjectEvidenceBundle } from "@/lib/intelligence/project-evidence";
import type { IntelligenceProvider } from "@/lib/intelligence/provider-interface";
import { RuleBasedIntelligenceProvider } from "@/lib/intelligence/providers/rule-based-provider";
import { runIntelligenceV2 } from "@/lib/intelligence/v2/engine";

/**
 * Default: the v2 engine (SQL aggregates, period comparison, ranked detectors).
 * Passing a provider explicitly, or a v2 failure, falls back to the legacy
 * rule-based provider so intelligence never disappears.
 */
export async function runIntelligence(
  input: IntelligenceRunInput,
  provider?: IntelligenceProvider,
): Promise<IntelligenceRunOutput> {
  if (!provider) {
    try {
      return await runIntelligenceV2(input);
    } catch (error) {
      console.error("INTEL_V2_FAILED_FALLING_BACK", error instanceof Error ? error.message : error);
    }
  }

  const evidence = await getProjectEvidenceBundle({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
  });

  return (provider ?? new RuleBasedIntelligenceProvider()).generate({
    input,
    evidence,
  });
}
