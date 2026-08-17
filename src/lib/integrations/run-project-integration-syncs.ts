import type {
  IntegrationSyncContext,
  IntegrationSyncResult,
} from "@/lib/integrations/sync-contracts";
import { integrationSyncRegistry } from "@/lib/integrations/sync-registry";

export async function runProjectIntegrationSyncs(
  context: IntegrationSyncContext,
): Promise<IntegrationSyncResult[]> {
  const results: IntegrationSyncResult[] = [];

  for (const runner of integrationSyncRegistry) {
    if (!runner.canRun(context)) {
      results.push({
        provider: runner.provider,
        status: "skipped",
        reason: runner.skipReason(context),
        rowsSynced: 0,
      });
      continue;
    }

    try {
      results.push(await runner.sync(context));
    } catch (error) {
      console.error(`${runner.provider} sync error:`, error);

      results.push({
        provider: runner.provider,
        status: "error",
        reason:
          error instanceof Error
            ? error.message
            : `${runner.provider} entity sync failed.`,
        rowsSynced: 0,
      });
    }
  }

  return results;
}
