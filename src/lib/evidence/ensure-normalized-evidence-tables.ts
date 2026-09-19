import { prisma } from "@/lib/prisma";

export async function ensureNormalizedEvidenceTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ga4_source_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      source TEXT NOT NULL,
      sessions INT NOT NULL DEFAULT 0
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ga4_landing_page_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      landing_page TEXT NOT NULL,
      sessions INT NOT NULL DEFAULT 0
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS gsc_query_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      query TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS gsc_page_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      page TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS gbp_location_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date DATE NOT NULL,
      location_name TEXT NOT NULL,
      location_label TEXT,
      account_name TEXT,
      metric TEXT NOT NULL,
      value INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS google_ads_campaign_daily (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      date DATE NOT NULL,
      customer_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      campaign_name TEXT,
      campaign_status TEXT,
      channel_type TEXT,
      impressions INT NOT NULL DEFAULT 0,
      clicks INT NOT NULL DEFAULT 0,
      cost_micros BIGINT NOT NULL DEFAULT 0,
      conversions DOUBLE PRECISION NOT NULL DEFAULT 0,
      ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
      average_cpc_micros BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ga4_source_daily_workspace_project_date
    ON ga4_source_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ga4_landing_page_daily_workspace_project_date
    ON ga4_landing_page_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_gsc_query_daily_workspace_project_date
    ON gsc_query_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_gsc_page_daily_workspace_project_date
    ON gsc_page_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_gbp_location_daily_workspace_project_date
    ON gbp_location_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_gbp_location_daily_workspace_project_metric_date
    ON gbp_location_daily (workspace_id, project_slug, metric, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_google_ads_campaign_daily_workspace_project_date
    ON google_ads_campaign_daily (workspace_id, project_slug, date);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_google_ads_campaign_daily_workspace_project_campaign_date
    ON google_ads_campaign_daily (workspace_id, project_slug, campaign_id, date);
  `);
}
