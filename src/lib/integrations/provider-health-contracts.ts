import type { IntegrationKey } from "@/lib/integrations/integration-contracts";
import type { ProviderCapabilityMatrix } from "@/lib/integrations/provider-capabilities";

export type ProviderHealthState = "ready" | "partial" | "blocked" | "preserved" | "missing";

export type ProviderHealthRecord = {
  key: IntegrationKey;
  label: string;
  state: ProviderHealthState;
  connected: boolean;
  mapped: boolean;
  syncCapable: boolean;
  evidenceReady: boolean;
  intelligenceReady: boolean;
  capabilities: ProviderCapabilityMatrix;
  blockers: string[];
  nextAction: string;
  evidenceTargets: string[];
};

export type ProviderHealthSummary = {
  connectedCount: number;
  readyCount: number;
  blockedCount: number;
  preservedCount: number;
  evidenceReadyCount: number;
  intelligenceReadyCount: number;
  records: ProviderHealthRecord[];
};

export type ProjectIntegrationHealth = {
  projectId: string;
  workspaceId: string | null;
  providersConnected: number;
  providersReady: number;
  evidenceReady: number;
  intelligenceReady: number;
  criticalBlockers: string[];
  nextActions: string[];
  records: ProviderHealthRecord[];
};
