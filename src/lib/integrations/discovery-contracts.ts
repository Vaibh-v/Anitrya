import type {
  IntegrationConnectionMode,
  IntegrationKey,
} from "@/lib/integrations/integration-contracts";

export type IntegrationDiscoveryAssetKind =
  | "analytics_property"
  | "search_site"
  | "business_location"
  | "ads_account"
  | "market_topic";

export type IntegrationDiscoveryStatus =
  | "ready"
  | "empty"
  | "blocked"
  | "error"
  | "preserved";

export type IntegrationDiscoveryContract = {
  provider: IntegrationKey;
  label: string;
  connectionMode: IntegrationConnectionMode;
  requiredScopes: string[];
  assetKind: IntegrationDiscoveryAssetKind;
  requiresWorkspaceToken: boolean;
  requiresProjectMapping: boolean;
  normalizedTargetTables: string[];
  evidenceTargets: string[];
  preserved: boolean;
  blockerReasons: string[];
  nextAction: string;
};

export type IntegrationDiscoveryAsset = {
  provider: IntegrationKey;
  assetKind: IntegrationDiscoveryAssetKind;
  sourceId: string;
  displayName: string;
  parentSourceId?: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type IntegrationDiscoveryResult = {
  provider: IntegrationKey;
  status: IntegrationDiscoveryStatus;
  assets: IntegrationDiscoveryAsset[];
  reason: string;
  checkedAt: string;
};
