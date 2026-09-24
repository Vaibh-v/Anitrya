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
import {
  getLatestGoogleAdsAccountMapping,
  readGoogleAdsAccountMappingFromMetadata,
} from "@/lib/integrations/google/ads/account-mapping-ledger";
import {
  getLatestGbpLocationMapping,
  readGbpLocationMappingFromMetadata,
} from "@/lib/integrations/google/gbp/location-mapping-ledger";
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
  GOOGLE_TRENDS: "google_trends",
  SEMRUSH: "semrush",
  BIRDEYE: "birdeye",
};

const PROVIDER_SYNC_SOURCE_MAP: Partial<Record<IntegrationKey, string>> = {
  google_ga4: "GOOGLE_GA4",
  google_gsc: "GOOGLE_GSC",
  google_ads: "GOOGLE_ADS",
  google_business_profile: "GOOGLE_GBP",
  google_trends: "GOOGLE_TRENDS",
  semrush: "SEMRUSH",
  birdeye: "BIRDEYE",
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

type WorkspaceSyncRunSummary = {
  source: string;
  status: string;
  rowsSynced: number;
  startedAt: Date;
  endedAt: Date | null;
  metadata: unknown;
};

type ProjectMappingSnapshot = {
  ga4PropertyId: string | null;
  gscSiteId: string | null;
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
  const requiredScopes = PROVIDER_REQUIRED_SCOPES[input.providerKey] ?? [];
  if (requiredScopes.length === 0) return input.tokenKeys.has(input.providerKey);

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

function metadataMatchesProject(
  metadata: unknown,
  projectId?: string | null
): boolean {
  if (!projectId) return true;
  if (!metadata || typeof metadata !== "object") return true;

  const record = metadata as Record<string, unknown>;
  const candidates = [
    record.projectId,
    record.projectSlug,
    record.projectLabel,
  ].filter((value): value is string => typeof value === "string");

  return candidates.length === 0 || candidates.includes(projectId);
}

function findLatestSyncRun(input: {
  providerKey: IntegrationKey;
  projectId?: string | null;
  runs: WorkspaceSyncRunSummary[];
}) {
  const source = PROVIDER_SYNC_SOURCE_MAP[input.providerKey];
  if (!source) return null;

  return (
    input.runs.find(
      (run) =>
        run.source === source &&
        !readGoogleAdsAccountMappingFromMetadata(run.metadata) &&
        !readGbpLocationMappingFromMetadata(run.metadata) &&
        metadataMatchesProject(run.metadata, input.projectId)
    ) ?? null
  );
}

function normalizeSyncStatus(
  status: string | null | undefined
): ProviderHealthRecord["lastSyncStatus"] {
  if (status === "SUCCESS") return "success";
  if (status === "ERROR") return "error";
  if (status === "RUNNING") return "running";
  return "unknown";
}

function buildMissingRequirements(input: {
  connected: boolean;
  mapped: boolean;
  syncCapable: boolean;
  providerRequiresToken: boolean;
  providerRequiresMapping: boolean;
  blockers: string[];
}) {
  const requirements: string[] = [];

  if (input.providerRequiresToken && !input.connected) {
    requirements.push("workspace connection");
  }

  if (input.providerRequiresMapping && !input.mapped) {
    requirements.push("project mapping");
  }

  if (!input.syncCapable) {
    requirements.push("sync runner");
  }

  if (input.blockers.length > 0) {
    requirements.push("blocker resolution");
  }

  return requirements.filter(
    (requirement, index, array) => array.indexOf(requirement) === index
  );
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

function hasProjectMapping(input: {
  providerKey: IntegrationKey;
  projectId?: string | null;
  mapping: ProjectMappingSnapshot | null;
  adsMapped: boolean;
  gbpMapped: boolean;
}) {
  if (!input.projectId) return false;

  if (input.providerKey === "google_ga4") {
    return Boolean(input.mapping?.ga4PropertyId);
  }

  if (input.providerKey === "google_gsc") {
    return Boolean(input.mapping?.gscSiteId);
  }

  if (input.providerKey === "google_ads") {
    return input.adsMapped;
  }

  if (input.providerKey === "google_business_profile") {
    return input.gbpMapped;
  }

  return false;
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

  const syncRuns = await prisma.syncRun.findMany({
    where: { workspaceId },
    orderBy: { startedAt: "desc" },
    take: 80,
    select: {
      source: true,
      status: true,
      rowsSynced: true,
      startedAt: true,
      endedAt: true,
      metadata: true,
    },
  });
  const projectMapping = projectId
    ? await prisma.project.findFirst({
        where: {
          workspaceId,
          OR: [{ id: projectId }, { slug: projectId }, { name: projectId }],
        },
        select: {
          slug: true,
          ga4PropertyId: true,
          gscSiteId: true,
        },
      })
    : null;
  const [adsMapping, gbpMapping] = projectMapping
    ? await Promise.all([
        getLatestGoogleAdsAccountMapping({ workspaceId, projectSlug: projectMapping.slug }),
        getLatestGbpLocationMapping({ workspaceId, projectSlug: projectMapping.slug }),
      ])
    : [null, null];

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
    const mapped = provider.requiresProjectMapping
      ? hasProjectMapping({
          providerKey: provider.key,
          projectId,
          mapping: projectMapping,
          adsMapped: Boolean(adsMapping),
          gbpMapped: Boolean(gbpMapping),
        })
      : true;
    const latestSyncRun = findLatestSyncRun({
      providerKey: provider.key,
      projectId,
      runs: syncRuns,
    });
    const syncCapable =
      connected && capabilities.canSync.enabled && mapped &&
      providerSpecificBlockers(provider.key).length === 0;
    const evidenceReady =
      connected &&
      mapped &&
      capabilities.canExportEvidence.enabled &&
      (provider.key === "google_ga4" ||
        provider.key === "google_gsc" ||
        ((provider.key === "google_ads" ||
          provider.key === "google_business_profile") &&
          latestSyncRun?.status === "SUCCESS" && latestSyncRun.rowsSynced > 0));
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
    const missingRequirements = buildMissingRequirements({
      connected,
      mapped,
      syncCapable,
      providerRequiresToken: provider.requiresWorkspaceToken,
      providerRequiresMapping: provider.requiresProjectMapping,
      blockers,
    });

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
      lastSyncAt:
        latestSyncRun?.endedAt?.toISOString() ??
        latestSyncRun?.startedAt.toISOString() ??
        null,
      lastSyncStatus: normalizeSyncStatus(latestSyncRun?.status),
      lastSyncRows: latestSyncRun?.rowsSynced ?? 0,
      missingRequirements,
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
