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
}
