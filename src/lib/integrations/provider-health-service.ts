import { prisma } from "@/lib/prisma";
import type { IntegrationKey } from "@/lib/integrations/integration-contracts";
import { GOOGLE_ADS_DEVELOPER_TOKEN_ENV } from "@/lib/integrations/google/ads/discovery-contract";
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "@/lib/integrations/google/gbp/discovery-contract";
import {
  GOOGLE_ADS_SCOPE,
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
} from "@/lib/auth.config";
import {
  getProviderCapabilityMatrix,
  PROVIDER_REGISTRY,
} from "@/lib/integrations/provider-registry";
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

const PROVIDER_REQUIRED_SCOPES: Partial<Record<IntegrationKey, string[]>> = {
  google_ga4: [GOOGLE_ANALYTICS_SCOPE],
  google_gsc: [GOOGLE_SEARCH_CONSOLE_SCOPE],
  google_ads: [GOOGLE_ADS_SCOPE],
  google_business_profile: [GOOGLE_BUSINESS_PROFILE_SCOPE],
};

type WorkspaceTokenSummary = {
  provider: string;
  scope: string | null;
  updatedAt: Date;
};

function parseScopes(scope: string | null | undefined) {
  return new Set(
    (scope ?? "")
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function tokenHasRequiredScopes(
  token: WorkspaceTokenSummary,
  requiredScopes: string[]
) {
  if (requiredScopes.length === 0) return true;

  const tokenScopes = parseScopes(token.scope);
  return requiredScopes.every((scope) => tokenScopes.has(scope));
}

function hasProviderConnection(input: {
  providerKey: IntegrationKey;
  tokens: WorkspaceTokenSummary[];
  tokenKeys: Set<IntegrationKey>;
}) {
  if (input.tokenKeys.has(input.providerKey)) return true;

  const requiredScopes = PROVIDER_REQUIRED_SCOPES[input.providerKey] ?? [];
  if (requiredScopes.length === 0) return false;

  return input.tokens.some((token) =>
    tokenHasRequiredScopes(token, requiredScopes)
  );
}

function providerSpecificBlockers(providerKey: IntegrationKey) {
  if (
    providerKey === "google_ads" &&
    !process.env[GOOGLE_ADS_DEVELOPER_TOKEN_ENV]
  ) {
    return [
      "GOOGLE_ADS_DEVELOPER_TOKEN is missing on the server, so Google Ads customer discovery cannot run yet.",
    ];
  }

  return [];
}

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
      scope: true,
      updatedAt: true,
    },
  });

  const tokenKeys = new Set<IntegrationKey>();
  for (const token of tokens) {
    const mapped = PROVIDER_TOKEN_MAP[token.provider];
    if (mapped) tokenKeys.add(mapped);
  }

  const records: ProviderHealthRecord[] = PROVIDER_REGISTRY.map((provider) => {
    const capabilities = getProviderCapabilityMatrix(provider);
    const connected = hasProviderConnection({
      providerKey: provider.key,
      tokens,
      tokenKeys,
    });
    const mapped = provider.requiresProjectMapping ? Boolean(projectId) : true;
    const syncCapable = connected && capabilities.canSync.enabled && mapped;
    const evidenceReady =
      connected &&
      mapped &&
      capabilities.canExportEvidence.enabled &&
      (provider.key === "google_ga4" || provider.key === "google_gsc");
    const intelligenceReady =
      connected && mapped && capabilities.canPowerIntelligence.enabled;

    const blockers = [
      ...(provider.blockedByDefault ?? []),
      ...providerSpecificBlockers(provider.key),
      ...Object.values(capabilities)
        .filter((capability) => capability.state === "blocked")
        .map((capability) => capability.reason),
      ...(provider.requiresProjectMapping && !projectId
        ? ["Project mapping is required before this provider can safely contribute."]
        : []),
      ...(provider.requiresWorkspaceToken && !connected
        ? ["Workspace connection is missing for this provider."]
        : []),
      ...(!capabilities.canSync.enabled && connected && provider.lifecycle !== "active"
        ? ["Provider is connected conceptually but sync is not yet enabled in the product."]
        : []),
    ].filter((blocker, index, array) => array.indexOf(blocker) === index);

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
      capabilities,
      blockers,
      nextAction: connected
        ? capabilities.canSync.enabled
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
