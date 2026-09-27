/**
 * AI memory: every consensus is stored in the database (instant reuse) and
 * mirrored to the founder master sheet's ai_memory tab (the readable,
 * ever-growing intelligence layer). Failures never block an answer.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { OWNER_MASTER_SPREADSHEET_ID } from "@/lib/intelligence/owner-network/constants";
import { appendRows, ensureSheetStructure } from "@/lib/intelligence/owner-network/google-sheets";
import { ownerSheetsAuthMode } from "@/lib/intelligence/owner-network/owner-auth";
import type { Consensus } from "@/lib/ai/consensus";

const TAB = "ai_memory";
const HEADERS = ["created_at", "workspace_id", "project_slug", "category", "question", "agreement", "summary", "top_cause", "action", "models_ok", "models_total", "evidence_hash"];

export async function recallConsensus(workspaceId: string, evidenceHash: string): Promise<Consensus | null> {
  try {
    await ensureAdditiveSchema();
    const rows = await prisma.$queryRawUnsafe<Array<{ consensus: Consensus }>>(
      `SELECT consensus FROM ai_memory WHERE workspace_id = $1 AND evidence_hash = $2 LIMIT 1`,
      workspaceId,
      evidenceHash,
    );
    return rows[0]?.consensus ?? null;
  } catch {
    return null;
  }
}

export async function rememberConsensus(input: { workspaceId: string; projectSlug: string; category: string; consensus: Consensus }) {
  const c = input.consensus;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ai_memory (workspace_id, project_slug, evidence_hash, category, question, consensus)
       VALUES ($1, $2, $3, $4, $5, CAST($6 AS JSONB))
       ON CONFLICT (workspace_id, evidence_hash) DO UPDATE SET consensus = EXCLUDED.consensus, created_at = CURRENT_TIMESTAMP`,
      input.workspaceId,
      input.projectSlug,
      c.evidenceHash,
      input.category,
      c.question,
      JSON.stringify(c),
    );
  } catch (error) {
    console.warn("AI_MEMORY_DB_WRITE_FAILED", error instanceof Error ? error.message : error);
  }
  try {
    if (!(await ownerSheetsAuthMode())) return;
    await ensureSheetStructure(OWNER_MASTER_SPREADSHEET_ID, { [TAB]: HEADERS });
    await appendRows(OWNER_MASTER_SPREADSHEET_ID, TAB, [
      [
        c.generatedAt,
        input.workspaceId,
        input.projectSlug,
        input.category,
        c.question,
        c.agreement,
        c.summary ?? "",
        c.causes[0]?.cause ?? "",
        c.action ?? "",
        String(c.models.filter((m) => m.ok).length),
        String(c.models.length),
        c.evidenceHash,
      ],
    ]);
  } catch (error) {
    console.warn("AI_MEMORY_SHEET_WRITE_FAILED", error instanceof Error ? error.message : error);
  }
}
