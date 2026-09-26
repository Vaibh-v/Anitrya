import type {
  IntegrationCapability,
  IntegrationConnectionMode,
  IntegrationKey,
  IntegrationLifecycle,
} from "@/lib/integrations/integration-contracts";
import type { ProviderCapabilityMatrix } from "@/lib/integrations/provider-capabilities";
import { buildProviderCapabilityMatrix } from "@/lib/integrations/provider-capabilities";

export type ProviderRegistryItem = {
  key: IntegrationKey;
  label: string;
  lifecycle: IntegrationLifecycle;
  connectionMode: IntegrationConnectionMode;
  capabilities: IntegrationCapability[];
  powersSettings: boolean;
  powersSync: boolean;
  powersEvidence: boolean;
  powersIntelligence: boolean;
  requiresProjectMapping: boolean;
  requiresWorkspaceToken: boolean;
  evidenceTargets: string[];
  blockedByDefault?: string[];
};

export const PROVIDER_REGISTRY: ProviderRegistryItem[] = [
  {
    key: "google_ga4",
    label: "Google Analytics 4",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: ["discovery", "sync", "normalization", "reasoning_input", "entity_mapping", "export_support"],
    powersSettings: true,
    powersSync: true,
    powersEvidence: true,
    powersIntelligence: true,
    requiresProjectMapping: true,
    requiresWorkspaceToken: true,
    evidenceTargets: ["overview", "behavior", "intelligence"],
  },
  {
    key: "google_gsc",
    label: "Google Search Console",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: ["discovery", "sync", "normalization", "reasoning_input", "entity_mapping", "export_support"],
    powersSettings: true,
    powersSync: true,
    powersEvidence: true,
    powersIntelligence: true,
    requiresProjectMapping: true,
    requiresWorkspaceToken: true,
    evidenceTargets: ["overview", "seo", "intelligence"],
  },
  {
    key: "google_ads",
    label: "Google Ads",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: ["discovery", "sync", "normalization", "reasoning_input", "competitive_context", "entity_mapping", "export_support"],
    powersSettings: true,
    powersSync: true,
    powersEvidence: true,
    powersIntelligence: false,
    requiresProjectMapping: true,
    requiresWorkspaceToken: true,
    evidenceTargets: ["intelligence", "overview"],
  },
  {
    key: "google_trends",
    label: "Google Trends",
    lifecycle: "preserved",
    connectionMode: "manual_review",
    capabilities: ["sync", "reasoning_input", "competitive_context", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: false,
    requiresWorkspaceToken: false,
    evidenceTargets: ["intelligence", "overview"],
    blockedByDefault: ["Provider preserved in architecture but no normalized collection path is active yet."],
  },
  {
    key: "google_business_profile",
    label: "Google Business Profile",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: ["discovery", "sync", "normalization", "reasoning_input", "entity_mapping", "export_support"],
    powersSettings: true,
    powersSync: true,
    powersEvidence: true,
    powersIntelligence: false,
    requiresProjectMapping: true,
    requiresWorkspaceToken: true,
    evidenceTargets: ["intelligence", "overview"],
  },
  {
    key: "openai_chatgpt",
    label: "ChatGPT",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: false,
    requiresWorkspaceToken: false,
    evidenceTargets: ["intelligence"],
    blockedByDefault: ["AI provider should not be activated until evidence-backed routing is finalized."],
  },
  {
    key: "anthropic_claude",
    label: "Claude",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: false,
    requiresWorkspaceToken: false,
    evidenceTargets: ["intelligence"],
    blockedByDefault: ["AI provider should not be activated until evidence-backed routing is finalized."],
  },
  {
    key: "google_gemini",
    label: "Gemini",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: false,
    requiresWorkspaceToken: false,
    evidenceTargets: ["intelligence"],
    blockedByDefault: ["AI provider should not be activated until evidence-backed routing is finalized."],
  },
  {
    key: "semrush",
    label: "SEMrush",
    // Stays "preserved" so it reads as optional until a key is connected;
    // sync/normalization/export are enabled and gated by semrush-readiness
    // (encrypted API key + project domain mapping + evidence storage).
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: [
      "sync",
      "normalization",
      "entity_mapping",
      "competitive_context",
      "reasoning_input",
      "export_support",
    ],
    powersSettings: true,
    powersSync: true,
    powersEvidence: true,
    powersIntelligence: true,
    requiresProjectMapping: true,
    requiresWorkspaceToken: true,
    evidenceTargets: ["seo", "intelligence"],
  },
  {
    key: "birdeye",
    label: "Birdeye",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["sync", "reasoning_input", "entity_mapping", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: true,
    requiresWorkspaceToken: false,
    evidenceTargets: ["intelligence", "overview"],
    blockedByDefault: ["Reputation layer is preserved but not yet connected to normalization."],
  },
  {
    key: "linkwhisper",
    label: "LinkWhisper",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["sync", "content_context", "reasoning_input", "export_support"],
    powersSettings: true,
    powersSync: false,
    powersEvidence: false,
    powersIntelligence: true,
    requiresProjectMapping: true,
    requiresWorkspaceToken: false,
    evidenceTargets: ["seo", "intelligence"],
    blockedByDefault: ["Content architecture layer is preserved but not yet connected to normalization."],
  },
];

export function getProviderRegistryItem(key: IntegrationKey) {
  return PROVIDER_REGISTRY.find((item) => item.key === key) ?? null;
}

export function getProviderCapabilityMatrix(
  provider: ProviderRegistryItem,
): ProviderCapabilityMatrix {
  return buildProviderCapabilityMatrix({
    key: provider.key,
    lifecycle: provider.lifecycle,
    capabilities: provider.capabilities,
    powersSync: provider.powersSync,
    powersEvidence: provider.powersEvidence,
    powersIntelligence: provider.powersIntelligence,
  });
}
