import { INTEGRATION_CATALOG } from "@/lib/integrations/integration-catalog";
import { buildDefaultIntegrationState } from "@/lib/integrations/integration-readiness";
import { getWorkspaceProviderTokenSnapshot } from "@/lib/integrations/provider-token-snapshot";
import type {
  WorkspaceIntegrationSummary,
  WorkspaceIntegrationState,
} from "@/lib/integrations/integration-contracts";

const PROVIDER_MAP: Record<string, WorkspaceIntegrationState["key"] | undefined> = {
  GOOGLE_GA4: "google_ga4",
  GOOGLE_GSC: "google_gsc",
  GOOGLE_ADS: "google_ads",
  GOOGLE_GBP: "google_business_profile",
};

export async function buildWorkspaceIntegrationSummary(
  workspaceId: string
): Promise<WorkspaceIntegrationSummary> {
  const tokens = await getWorkspaceProviderTokenSnapshot(workspaceId);

  const tokenMap = new Map<string, string>();
  for (const token of tokens) {
    const mapped = PROVIDER_MAP[token.provider];
    if (!mapped) continue;
    if (!tokenMap.has(mapped)) {
      tokenMap.set(mapped, token.updatedAt.toISOString());
    }
  }

  const items = INTEGRATION_CATALOG.map((catalogItem) => {
    const base = buildDefaultIntegrationState(catalogItem);
    const tokenUpdatedAt = tokenMap.get(catalogItem.key);

    if (!tokenUpdatedAt) return base;

    return {
      ...base,
      connected: true,
      statusLabel:
        catalogItem.lifecycle === "active" ? "connected" : "preserved",
      lastCheckedAt: tokenUpdatedAt,
      lastSyncAt: null,
      blockers:
        catalogItem.lifecycle === "active"
          ? ["Connection exists, but normalized sync confirmation is still required."]
          : base.blockers,
      nextStep:
        catalogItem.lifecycle === "active"
          ? "Run sync and confirm normalized evidence hydrates correctly."
          : base.nextStep,
    };
  });

  return {
    connectedCount: items.filter((item) => item.connected).length,
    readyCount: items.filter(
      (item) => item.connected && item.lifecycle === "active"
    ).length,
    blockedCount: items.filter((item) => item.lifecycle === "blocked").length,
    preservedCount: items.filter((item) => item.lifecycle === "preserved").length,
    items,
  };
}