CREATE TABLE IF NOT EXISTS "gbp_location_daily" (
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
);

CREATE INDEX IF NOT EXISTS "idx_gbp_location_daily_workspace_project_date"
ON "gbp_location_daily" ("workspace_id", "project_slug", "date");

CREATE INDEX IF NOT EXISTS "idx_gbp_location_daily_workspace_project_metric_date"
ON "gbp_location_daily" ("workspace_id", "project_slug", "metric", "date");