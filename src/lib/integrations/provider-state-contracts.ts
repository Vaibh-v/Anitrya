export type ProviderIntegrationId =
  | "google_business_profile"
  | "google_ads"
  | "google_trends";

export type ProviderConnectionState =
  | "reserved"
  | "wired"
  | "blocked"
  | "connected";

export type ProviderConnectionScope = "project";

export type ProviderStateRecord = {
  id: string;
  workspaceId: string;
  projectSlug: string;
  providerId: ProviderIntegrationId;
  state: ProviderConnectionState;
  scope: ProviderConnectionScope;
  label: string;
  reason: string;
  metadata: Record<string, string | number | boolean | null>;
  updatedAt: string;
};

export type ProviderStateStoreShape = {
  records: ProviderStateRecord[];
};

export type ProviderStateSummaryCard = {
  label: string;
  value: number;
  context: string;
};

export type ProviderStateMutationInput = {
  workspaceId: string;
  projectSlug: string;
  providerId: ProviderIntegrationId;
  state: ProviderConnectionState;
  label?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export const PROVIDER_IDS: ProviderIntegrationId[] = [
  "google_business_profile",
  "google_ads",
  "google_trends",
];

export function providerDisplayLabel(
  providerId: ProviderIntegrationId
): string {
  switch (providerId) {
    case "google_business_profile":
      return "Google Business Profile";
    case "google_ads":
      return "Google Ads";
    case "google_trends":
      return "Google Trends";
    default:
      return providerId;
  }
}

export function providerDefaultReason(
  providerId: ProviderIntegrationId,
  state: ProviderConnectionState
): string {
  if (state === "reserved") {
    switch (providerId) {
      case "google_business_profile":
        return "Prepared for OAuth discovery and location mapping.";
      case "google_ads":
        return "Prepared for OAuth discovery and account mapping.";
      case "google_trends":
        return "Prepared for topic mapping and market-context intake.";
      default:
        return "Prepared for future provider wiring.";
    }
  }

  if (state === "wired") {
    return "Provider wiring is in place and awaiting project connection.";
  }

  if (state === "blocked") {
    return "Provider is visible but currently blocked by missing wiring or configuration.";
  }

  return "Provider is connected and project-scoped mapping is available.";
}