import type {
  IntelligenceRunInput,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";
import type { ProjectEvidenceBundle } from "@/lib/intelligence/project-evidence";

export type IntelligenceProviderName =
  | "rule_based"
  | "openai"
  | "gemini"
  | "claude";

export type IntelligenceProviderContext = {
  input: IntelligenceRunInput;
  evidence: ProjectEvidenceBundle;
};

export interface IntelligenceProvider {
  readonly name: IntelligenceProviderName;
  readonly modelVersion: string;
  generate(context: IntelligenceProviderContext): Promise<IntelligenceRunOutput>;
}