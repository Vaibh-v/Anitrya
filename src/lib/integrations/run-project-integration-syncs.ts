import type {
  IntegrationSyncContext,
  IntegrationSyncResult,
} from "@/lib/integrations/sync-contracts";
import { recordIntegrationSyncResult } from "@/lib/integrations/sync-audit";
import { integrationSyncRegistry } from "@/lib/integrations/sync-registry";

export async function runProjectIntegrationSyncs(
  context: IntegrationSyncContext,
): Promise<IntegrationSyncResult[]> {
  const results: IntegrationSyncResult[] = [];

  for (const runner of integrationSyncRegistry) {
    if (!runner.canRun(context)) {
      const result: IntegrationSyncResult = {
        provider: runner.provider,
        status: "skipped",
        reason: runner.skipReason(context),
        rowsSynced: 0,
      };

      await recordIntegrationSyncResult({ context, result });
      results.push(result);
      continue;
    }

    try {
      const result = await runner.sync(context);
      await recordIntegrationSyncResult({ context, result });
      results.push(result);
    } catch (error) {
      console.error(`${runner.provider} sync error:`, error);

      const result: IntegrationSyncResult = {
        provider: runner.provider,
        status: "error",
        reason:
          error instanceof Error
            ? error.message
            : `${runner.provider} entity sync failed.`,
        rowsSynced: 0,
      };

      await recordIntegrationSyncResult({ context, result });
      results.push(result);
    }
  }

  return results;
}
