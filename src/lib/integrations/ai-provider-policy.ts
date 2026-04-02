import type { IntegrationKey } from "@/lib/integrations/integration-contracts";

export type AiProviderPolicy = {
  key: IntegrationKey;
  label: string;
  allowed: boolean;
  reasoningMode: "evidence_only";
  activationRule: string;
  blockedUntil: string;
};

export const AI_PROVIDER_POLICY: AiProviderPolicy[] = [
  {
    key: "openai_chatgpt",
    label: "ChatGPT",
    allowed: true,
    reasoningMode: "evidence_only",
    activationRule:
      "May reason only over synced normalized data and must surface missing-data constraints explicitly.",
    blockedUntil:
      "Provider orchestration is wired to evidence-backed routing and output provenance.",
  },
  {
    key: "anthropic_claude",
    label: "Claude",
    allowed: true,
    reasoningMode: "evidence_only",
    activationRule:
      "May reason only over synced normalized data and must preserve source-backed uncertainty.",
    blockedUntil:
      "Provider orchestration is wired to evidence-backed routing and output provenance.",
  },
  {
    key: "google_gemini",
    label: "Gemini",
    allowed: true,
    reasoningMode: "evidence_only",
    activationRule:
      "May reason only over synced normalized data and must preserve explicit missing-data visibility.",
    blockedUntil:
      "Provider orchestration is wired to evidence-backed routing and output provenance.",
  },
];

export function getAiProviderPolicy(key: IntegrationKey) {
  return AI_PROVIDER_POLICY.find((item) => item.key === key) ?? null;
}