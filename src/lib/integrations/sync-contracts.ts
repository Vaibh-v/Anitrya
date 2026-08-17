import type { ResolvedProjectMapping } from "@/lib/project/project-mapper";

export type IntegrationSyncProvider = "GOOGLE_GA4" | "GOOGLE_GSC";

export type IntegrationSyncStatus = "success" | "error" | "skipped";

export type IntegrationSyncResult = {
  provider: IntegrationSyncProvider;
  status: IntegrationSyncStatus;
  reason: string;
  rowsSynced: number;
};

export type IntegrationSyncContext = {
  workspaceId: string;
  mapping: ResolvedProjectMapping;
  from: string;
  to: string;
};

export type IntegrationSyncRunner = {
  provider: IntegrationSyncProvider;
  canRun(context: IntegrationSyncContext): boolean;
  skipReason(context: IntegrationSyncContext): string;
  sync(context: IntegrationSyncContext): Promise<IntegrationSyncResult>;
};
