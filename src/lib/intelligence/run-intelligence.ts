import type {
  IntelligenceRunInput,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";
import { getProjectEvidenceBundle } from "@/lib/intelligence/project-evidence";
import type { IntelligenceProvider } from "@/lib/intelligence/provider-interface";
import { RuleBasedIntelligenceProvider } from "@/lib/intelligence/providers/rule-based-provider";

export async function runIntelligence(
  input: IntelligenceRunInput,
  provider: IntelligenceProvider = new RuleBasedIntelligenceProvider(),
): Promise<IntelligenceRunOutput> {
  const evidence = await getProjectEvidenceBundle({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
  });

  return provider.generate({
    input,
    evidence,
  });
}