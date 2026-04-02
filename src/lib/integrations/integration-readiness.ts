import type {
  IntegrationCatalogItem,
  WorkspaceIntegrationState,
  IntegrationLifecycle,
} from "@/lib/integrations/integration-contracts";

function defaultBlockers(item: IntegrationCatalogItem): string[] {
  if (item.lifecycle === "active") {
    return ["Connection exists in architecture, but evidence hydration is not yet confirmed."];
  }

  if (item.lifecycle === "preserved") {
    return ["Integration is preserved in architecture but not yet activated."];
  }

  if (item.lifecycle === "blocked") {
    return ["Integration is currently blocked and cannot be used safely."];
  }

  return [];
}

function defaultNextStep(item: IntegrationCatalogItem): string {
  if (item.lifecycle === "active") {
    return "Confirm credentials, mapping, and normalized sync behavior.";
  }

  if (item.lifecycle === "preserved") {
    return "Keep the integration preserved and connect it only through the defined architecture.";
  }

  if (item.lifecycle === "blocked") {
    return "Resolve the blocking condition before exposing this provider in the product.";
  }

  return "Review integration readiness.";
}

function lifecycleLabel(lifecycle: IntegrationLifecycle, connected: boolean) {
  if (connected && lifecycle === "active") return "connected";
  if (lifecycle === "preserved") return "preserved";
  if (lifecycle === "blocked") return "blocked";
  if (lifecycle === "planned") return "planned";
  return connected ? "connected" : "not connected";
}

export function buildDefaultIntegrationState(
  item: IntegrationCatalogItem
): WorkspaceIntegrationState {
  const connected = false;

  return {
    key: item.key,
    connected,
    lifecycle: item.lifecycle,
    connectionMode: item.connectionMode,
    lastCheckedAt: null,
    lastSyncAt: null,
    statusLabel: lifecycleLabel(item.lifecycle, connected),
    blockers: defaultBlockers(item),
    nextStep: defaultNextStep(item),
  };
}