import { prisma } from "@/lib/prisma";

/**
 * Production builds run `prisma generate` but not `prisma migrate deploy`, so
 * the additive tables introduced after the initial schema can be missing on a
 * live database. These statements mirror those migrations exactly and are
 * idempotent (IF NOT EXISTS / guarded constraint), so running them on a
 * database that already has the tables is a no-op. Nothing existing is altered.
 */
const STATEMENTS = [
  // 20260917003000_add_sync_health_runs
  `CREATE TABLE IF NOT EXISTS "SyncHealthRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectSlug" TEXT NOT NULL,
    "projectLabel" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "ownerSheet" JSONB,
    "intelligence" JSONB,
    "nextActions" JSONB,
    "totalRowsSynced" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncHealthRun_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SyncHealthRun_workspaceId_projectSlug_createdAt_idx" ON "SyncHealthRun"("workspaceId", "projectSlug", "createdAt")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyncHealthRun_workspaceId_fkey') THEN
      ALTER TABLE "SyncHealthRun" ADD CONSTRAINT "SyncHealthRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  // 20260919090000_add_gbp_location_daily
  `CREATE TABLE IF NOT EXISTS "gbp_location_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_label" TEXT,
    "account_name" TEXT,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gbp_location_daily_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_gbp_location_daily_workspace_project_date" ON "gbp_location_daily" ("workspace_id", "project_slug", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_gbp_location_daily_workspace_project_metric_date" ON "gbp_location_daily" ("workspace_id", "project_slug", "metric", "date")`,
  // 20260919142000_add_google_ads_campaign_daily
  `CREATE TABLE IF NOT EXISTS "google_ads_campaign_daily" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_name" TEXT,
    "campaign_status" TEXT,
    "channel_type" TEXT,
    "impressions" INT NOT NULL DEFAULT 0,
    "clicks" INT NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_cpc_micros" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_google_ads_campaign_daily_workspace_project_date" ON "google_ads_campaign_daily" ("workspace_id", "project_slug", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_google_ads_campaign_daily_workspace_project_campaign_date" ON "google_ads_campaign_daily" ("workspace_id", "project_slug", "campaign_id", "date")`,
  // 20260923120000_add_semrush_evidence_snapshot
  `CREATE TABLE IF NOT EXISTS "semrush_evidence_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "window_from" DATE NOT NULL,
    "window_to" DATE NOT NULL,
    "domain" TEXT NOT NULL,
    "database_code" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "keyword" TEXT,
    "page_url" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'semrush',
    "source_version" TEXT NOT NULL DEFAULT 'analytics_v3',
    "availability" TEXT NOT NULL DEFAULT 'available',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "is_estimate" BOOLEAN NOT NULL DEFAULT true,
    "fetched_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "semrush_evidence_snapshot_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_semrush_evidence_snapshot_workspace_project_date" ON "semrush_evidence_snapshot" ("workspace_id", "project_slug", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_semrush_evidence_snapshot_workspace_project_domain_date" ON "semrush_evidence_snapshot" ("workspace_id", "project_slug", "domain", "database_code", "date")`,
];

let pending: Promise<void> | null = null;

/** Runs once per server instance; failures are logged and retried on the next call. */
export function ensureAdditiveSchema(): Promise<void> {
  if (!pending) {
    pending = (async () => {
      // One round trip in the common case: skip all DDL when every table exists.
      const present = await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT (to_regclass('"SyncHealthRun"') IS NOT NULL AND to_regclass('gbp_location_daily') IS NOT NULL
                 AND to_regclass('google_ads_campaign_daily') IS NOT NULL AND to_regclass('semrush_evidence_snapshot') IS NOT NULL) AS ok`,
      );
      if (present[0]?.ok) return;
      for (const statement of STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      console.error("ENSURE_ADDITIVE_SCHEMA_FAILED", error instanceof Error ? error.message : error);
      pending = null;
    });
  }
  return pending;
}

export const ADDITIVE_SCHEMA_STATEMENTS = STATEMENTS;
