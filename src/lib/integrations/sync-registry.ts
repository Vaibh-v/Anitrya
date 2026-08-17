import { googleGa4SyncRunner } from "@/lib/integrations/connectors/google-ga4-sync";
import { googleGscSyncRunner } from "@/lib/integrations/connectors/google-gsc-sync";
import type { IntegrationSyncRunner } from "@/lib/integrations/sync-contracts";

export const integrationSyncRegistry: IntegrationSyncRunner[] = [
  googleGa4SyncRunner,
  googleGscSyncRunner,
];
