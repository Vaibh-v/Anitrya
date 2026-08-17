import type {
  IntegrationCapability,
  IntegrationKey,
  IntegrationLifecycle,
} from "@/lib/integrations/integration-contracts";

export type ProviderCapabilityState = "ready" | "blocked" | "preserved";

export type ProviderCapability = {
  enabled: boolean;
  state: ProviderCapabilityState;
  reason: string;
};

export type ProviderCapabilityMatrix = {
  canDiscover: ProviderCapability;
  canMap: ProviderCapability;
  canSync: ProviderCapability;
  canNormalize: ProviderCapability;
  canExportEvidence: ProviderCapability;
  canPowerIntelligence: ProviderCapability;
};

export type ProviderCapabilityInput = {
  key: IntegrationKey;
  lifecycle: IntegrationLifecycle;
  capabilities: IntegrationCapability[];
  powersSync: boolean;
  powersEvidence: boolean;
  powersIntelligence: boolean;
};

function capability(input: {
  enabled: boolean;
  lifecycle: IntegrationLifecycle;
  readyReason: string;
  preservedReason: string;
  blockedReason: string;
}): ProviderCapability {
  if (!input.enabled && input.lifecycle === "preserved") {
    return {
      enabled: false,
      state: "preserved",
      reason: input.preservedReason,
    };
  }

  if (!input.enabled) {
    return {
      enabled: false,
      state: "blocked",
      reason: input.blockedReason,
    };
  }

  return {
    enabled: true,
    state: "ready",
    reason: input.readyReason,
  };
}

export function buildProviderCapabilityMatrix(
  input: ProviderCapabilityInput,
): ProviderCapabilityMatrix {
  const capabilities = new Set(input.capabilities);

  return {
    canDiscover: capability({
      enabled: capabilities.has("discovery"),
      lifecycle: input.lifecycle,
      readyReason: "OAuth discovery can identify available source assets.",
      preservedReason: "Discovery contract is preserved but not activated.",
      blockedReason: "Provider does not expose discovery in the current contract.",
    }),
    canMap: capability({
      enabled: capabilities.has("entity_mapping"),
      lifecycle: input.lifecycle,
      readyReason: "Provider can map source assets to Anitrya projects.",
      preservedReason: "Mapping contract is preserved for later activation.",
      blockedReason: "Provider does not support project mapping yet.",
    }),
    canSync: capability({
      enabled: input.powersSync && capabilities.has("sync"),
      lifecycle: input.lifecycle,
      readyReason: "Provider has an active server-side sync runner.",
      preservedReason: "Sync contract is preserved but no runner is active yet.",
      blockedReason: "Provider cannot sync normalized evidence yet.",
    }),
    canNormalize: capability({
      enabled: input.powersSync && capabilities.has("normalization"),
      lifecycle: input.lifecycle,
      readyReason: "Provider can normalize synced data into shared evidence.",
      preservedReason: "Normalization target is preserved for later activation.",
      blockedReason: "Provider data is not normalized into shared evidence yet.",
    }),
    canExportEvidence: capability({
      enabled: input.powersEvidence && capabilities.has("export_support"),
      lifecycle: input.lifecycle,
      readyReason: "Provider evidence can be exported through server-side flows.",
      preservedReason: "Export support is preserved until evidence sync is active.",
      blockedReason: "Provider evidence is not export-ready yet.",
    }),
    canPowerIntelligence: capability({
      enabled: input.powersIntelligence && capabilities.has("reasoning_input"),
      lifecycle: input.lifecycle,
      readyReason: "Provider output can contribute to evidence-backed reasoning.",
      preservedReason: "Intelligence role is reserved until evidence is active.",
      blockedReason: "Provider cannot power intelligence from synced data yet.",
    }),
  };
}
