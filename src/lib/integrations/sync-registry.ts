import { googleGa4SyncRunner } from "@/lib/integrations/connectors/google-ga4-sync";
import { googleAdsSyncRunner } from "@/lib/integrations/connectors/google-ads-sync";
import { googleGbpSyncRunner } from "@/lib/integrations/connectors/google-gbp-sync";
import { googleGscSyncRunner } from "@/lib/integrations/connectors/google-gsc-sync";
import { semrushSyncRunner } from "@/lib/integrations/connectors/semrush-sync";
import type { IntegrationSyncRunner } from "@/lib/integrations/sync-contracts";

export const integrationSyncRegistry: IntegrationSyncRunner[] = [
  googleGa4SyncRunner,
  googleGscSyncRunner,
  googleAdsSyncRunner,
  googleGbpSyncRunner,
  // External SEO evidence. Runs last; skips itself when no key/mapping exists.
  semrushSyncRunner,
];
