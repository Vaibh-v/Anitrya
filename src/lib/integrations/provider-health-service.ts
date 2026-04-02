import { prisma } from "@/lib/prisma";
import type { IntegrationKey } from "@/lib/integrations/integration-contracts";
import { PROVIDER_REGISTRY } from "@/lib/integrations/provider-registry";
import type {
  ProviderHealthRecord,
  ProviderHealthState,
  ProviderHealthSummary,
} from "@/lib/integrations/provider-health-contracts";

const PROVIDER_TOKEN_MAP: Record<string, IntegrationKey | undefined> = {
  GOOGLE_GA4: "google_ga4",
  GOOGLE_GSC: "google_gsc",
  GOOGLE_ADS: "google_ads",
  GOOGLE_GBP: "google_business_profile",
};

function deriveState(input: {
  connected: boolean;
  lifecycle: string;
  syncCapable: boolean;
  evidenceReady: boolean;
}): ProviderHealthState {
  if (!input.connected && input.lifecycle === "preserved") return "preserved";
  if (!input.connected) return "missing";
  if (input.connected && input.syncCapable && input.evidenceReady) return "ready";
  if (input.connected) return "partial";
  return "blocked";
}

export async function buildProviderHealthSummary(
  workspaceId: string,
  projectId?: string | null
): Promise<ProviderHealthSummary> {
  const tokens = await prisma.integrationToken.findMany({
    where: { workspaceId },
    select: {
      provider: true,
      updatedAt: true,
    },
  });

  const tokenKeys = new Set<IntegrationKey>();
  for (const token of tokens) {
    const mapped = PROVIDER_TOKEN_MAP[token.provider];
    if (mapped) tokenKeys.add(mapped);
  }

  const records: ProviderHealthRecord[] = PROVIDER_REGISTRY.map((provider) => {
    const connected = tokenKeys.has(provider.key);
    const mapped = provider.requiresProjectMapping ? Boolean(projectId) : true;
    const syncCapable = connected && provider.powersSync && mapped;
    const evidenceReady =
      connected &&
      mapped &&
      provider.powersEvidence &&
      (provider.key === "google_ga4" || provider.key === "google_gsc");
    const intelligenceReady =
      connected && mapped && provider.powersIntelligence;

    const blockers = [
      ...(provider.blockedByDefault ?? []),
      ...(provider.requiresProjectMapping && !projectId
        ? ["Project mapping is required before this provider can safely contribute."]
        : []),
      ...(provider.requiresWorkspaceToken && !connected
        ? ["Workspace connection is missing for this provider."]
        : []),
      ...(!provider.powersSync && connected && provider.lifecycle !== "active"
        ? ["Provider is connected conceptually but sync is not yet enabled in the product."]
        : []),
    ];

    return {
      key: provider.key,
      label: provider.label,
      state: deriveState({
        connected,
        lifecycle: provider.lifecycle,
        syncCapable,
        evidenceReady,
      }),
      connected,
      mapped,
      syncCapable,
      evidenceReady,
      intelligenceReady,
      blockers,
      nextAction: connected
        ? provider.powersSync
          ? "Validate mapping and run sync to confirm normalized evidence."
          : "Keep preserved until the provider is formally activated."
        : provider.requiresWorkspaceToken
        ? "Connect this provider from Settings before expecting evidence."
        : "Preserve this provider until activation work is scheduled.",
      evidenceTargets: provider.evidenceTargets,
    };
  });

  return {
    connectedCount: records.filter((record) => record.connected).length,
    readyCount: records.filter((record) => record.state === "ready").length,
    blockedCount: records.filter((record) => record.state === "blocked").length,
    preservedCount: records.filter((record) => record.state === "preserved").length,
    evidenceReadyCount: records.filter((record) => record.evidenceReady).length,
    intelligenceReadyCount: records.filter((record) => record.intelligenceReady).length,
    records,
  };
}