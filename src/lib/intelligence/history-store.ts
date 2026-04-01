import { prisma } from "@/lib/prisma";

export type IntelligenceHistoryRecord = {
  workspaceId: string;
  projectSlug: string;
  category: string;
  title: string;
  summary: string;
  confidence: string;
  score: number;
  evidenceJson: string;
  actionsJson: string;
  sourceWindowFrom: string | null;
  sourceWindowTo: string | null;
  fingerprint: string;
};

export type IntelligenceHistoryRow = {
  id: string;
  workspace_id: string;
  project_slug: string;
  category: string;
  title: string;
  summary: string;
  confidence: string;
  score: number;
  evidence_json: string;
  actions_json: string;
  source_window_from: string | null;
  source_window_to: string | null;
  fingerprint: string;
  created_at: Date;
};

let initialized = false;

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function ensureIntelligenceMemoryTables(): Promise<void> {
  if (initialized) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      confidence TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      source_window_from DATE NULL,
      source_window_to DATE NULL,
      fingerprint TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_intelligence_history_workspace_slug_created
    ON intelligence_history (workspace_id, project_slug, created_at DESC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_history_fingerprint
    ON intelligence_history (fingerprint);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS recommendation_outcomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id TEXT NOT NULL,
      project_slug TEXT NOT NULL,
      hypothesis_title TEXT NOT NULL,
      recommendation_title TEXT NOT NULL,
      outcome_status TEXT NOT NULL,
      outcome_note TEXT NOT NULL DEFAULT '',
      impact_delta INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_workspace_slug_created
    ON recommendation_outcomes (workspace_id, project_slug, created_at DESC);
  `);

  initialized = true;
}

export function buildHistoryFingerprint(input: {
  workspaceId: string;
  projectSlug: string;
  category: string;
  title: string;
  sourceWindowFrom: string | null;
  sourceWindowTo: string | null;
}): string {
  return [
    input.workspaceId,
    input.projectSlug,
    input.category,
    input.title.trim().toLowerCase(),
    input.sourceWindowFrom ?? "",
    input.sourceWindowTo ?? "",
  ].join("::");
}

export async function insertIntelligenceHistoryRecord(
  record: IntelligenceHistoryRecord
): Promise<void> {
  await ensureIntelligenceMemoryTables();

  await prisma.$executeRawUnsafe(`
    INSERT INTO intelligence_history (
      workspace_id,
      project_slug,
      category,
      title,
      summary,
      confidence,
      score,
      evidence_json,
      actions_json,
      source_window_from,
      source_window_to,
      fingerprint
    )
    VALUES (
      ${quote(record.workspaceId)},
      ${quote(record.projectSlug)},
      ${quote(record.category)},
      ${quote(record.title)},
      ${quote(record.summary)},
      ${quote(record.confidence)},
      ${Number(record.score)},
      ${quote(record.evidenceJson)}::jsonb,
      ${quote(record.actionsJson)}::jsonb,
      ${record.sourceWindowFrom ? quote(record.sourceWindowFrom) : "NULL"}::date,
      ${record.sourceWindowTo ? quote(record.sourceWindowTo) : "NULL"}::date,
      ${quote(record.fingerprint)}
    )
    ON CONFLICT (fingerprint) DO NOTHING;
  `);
}

export async function listRecentIntelligenceHistory(params: {
  workspaceId: string;
  projectSlug?: string;
  limit?: number;
}): Promise<IntelligenceHistoryRow[]> {
  await ensureIntelligenceMemoryTables();

  const limit = Math.max(1, Math.min(params.limit ?? 100, 500));

  const sql = `
    SELECT
      id,
      workspace_id,
      project_slug,
      category,
      title,
      summary,
      confidence,
      score,
      evidence_json,
      actions_json,
      source_window_from,
      source_window_to,
      fingerprint,
      created_at
    FROM intelligence_history
    WHERE workspace_id = ${quote(params.workspaceId)}
    ${params.projectSlug ? `AND project_slug = ${quote(params.projectSlug)}` : ""}
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  return prisma.$queryRawUnsafe<IntelligenceHistoryRow[]>(sql);
}