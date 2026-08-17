import type {
  IntegrationSyncContext,
  IntegrationSyncResult,
} from "@/lib/integrations/sync-contracts";
import { recordManualSyncRun } from "@/lib/sync/sync-run-recorder";

export async function recordIntegrationSyncResult(input: {
  context: IntegrationSyncContext;
  result: IntegrationSyncResult;
}): Promise<void> {
  const { context, result } = input;

  await recordManualSyncRun({
    workspaceId: context.workspaceId,
    source: result.provider,
    status: result.status === "error" ? "error" : "success",
    rowsSynced: result.rowsSynced,
    error: result.status === "error" ? result.reason : null,
    meta: {
      integrationStatus: result.status,
      reason: result.reason,
      projectId: context.mapping.projectId,
      projectSlug: context.mapping.projectSlug,
      projectLabel: context.mapping.projectLabel,
      from: context.from,
      to: context.to,
      ...(result.details ?? {}),
    },
  });
}
