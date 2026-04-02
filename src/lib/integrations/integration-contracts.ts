export type IntegrationKey =
  | "google_ga4"
  | "google_gsc"
  | "google_ads"
  | "google_trends"
  | "google_business_profile"
  | "openai_chatgpt"
  | "anthropic_claude"
  | "google_gemini"
  | "semrush"
  | "birdeye"
  | "linkwhisper";

export type IntegrationCategory =
  | "analytics"
  | "search"
  | "paid_media"
  | "local"
  | "ai"
  | "seo"
  | "content";

export type IntegrationConnectionMode =
  | "oauth"
  | "service_account"
  | "api_key"
  | "manual_review"
  | "workspace_native";

export type IntegrationLifecycle =
  | "active"
  | "preserved"
  | "planned"
  | "blocked"
  | "not_connected";

export type IntegrationCapability =
  | "discovery"
  | "sync"
  | "normalization"
  | "reasoning_input"
  | "export_support"
  | "entity_mapping"
  | "competitive_context"
  | "content_context"
  | "execution_feedback";

export type IntegrationCatalogItem = {
  key: IntegrationKey;
  label: string;
  category: IntegrationCategory;
  lifecycle: IntegrationLifecycle;
  connectionMode: IntegrationConnectionMode;
  capabilities: IntegrationCapability[];
  description: string;
  settingsSummary: string;
  evidenceRole: string;
  dependencyKeys?: IntegrationKey[];
};

export type WorkspaceIntegrationState = {
  key: IntegrationKey;
  connected: boolean;
  lifecycle: IntegrationLifecycle;
  connectionMode: IntegrationConnectionMode;
  lastCheckedAt: string | null;
  lastSyncAt: string | null;
  statusLabel: string;
  blockers: string[];
  nextStep: string;
};

export type WorkspaceIntegrationSummary = {
  connectedCount: number;
  readyCount: number;
  blockedCount: number;
  preservedCount: number;
  items: WorkspaceIntegrationState[];
};