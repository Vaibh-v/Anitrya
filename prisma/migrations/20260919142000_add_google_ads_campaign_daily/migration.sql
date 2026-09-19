CREATE TABLE IF NOT EXISTS "google_ads_campaign_daily" (
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
);

CREATE INDEX IF NOT EXISTS "idx_google_ads_campaign_daily_workspace_project_date"
ON "google_ads_campaign_daily" ("workspace_id", "project_slug", "date");

CREATE INDEX IF NOT EXISTS "idx_google_ads_campaign_daily_workspace_project_campaign_date"
ON "google_ads_campaign_daily" ("workspace_id", "project_slug", "campaign_id", "date");
