-- SEMrush external SEO evidence (project-scoped snapshot, long format).
-- Additive only: no existing table, column, enum or index is modified.
CREATE TABLE IF NOT EXISTS "semrush_evidence_snapshot" (
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
);

CREATE INDEX IF NOT EXISTS "idx_semrush_evidence_snapshot_workspace_project_date"
ON "semrush_evidence_snapshot" ("workspace_id", "project_slug", "date");

CREATE INDEX IF NOT EXISTS "idx_semrush_evidence_snapshot_workspace_project_domain_date"
ON "semrush_evidence_snapshot" ("workspace_id", "project_slug", "domain", "database_code", "date");
