import { prisma } from "@/lib/prisma";
import { ensureIntelligenceMemoryTables } from "@/lib/intelligence/history-store";

export type RecommendationOutcomeInput = {
  workspaceId: string;
  projectSlug: string;
  hypothesisTitle: string;
  recommendationTitle: string;
  outcomeStatus: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
  outcomeNote?: string;
  impactDelta?: number;
};

export type RecommendationOutcomeRow = {
  id: string;
  workspace_id: string;
  project_slug: string;
  hypothesis_title: string;
  recommendation_title: string;
  outcome_status: string;
  outcome_note: string;
  impact_delta: number;
  created_at: Date;
};

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function insertRecommendationOutcome(
  input: RecommendationOutcomeInput
): Promise<void> {
  await ensureIntelligenceMemoryTables();

  await prisma.$executeRawUnsafe(`
    INSERT INTO recommendation_outcomes (
      workspace_id,
      project_slug,
      hypothesis_title,
      recommendation_title,
      outcome_status,
      outcome_note,
      impact_delta
    )
    VALUES (
      ${quote(input.workspaceId)},
      ${quote(input.projectSlug)},
      ${quote(input.hypothesisTitle)},
      ${quote(input.recommendationTitle)},
      ${quote(input.outcomeStatus)},
      ${quote(input.outcomeNote ?? "")},
      ${Number(input.impactDelta ?? 0)}
    );
  `);
}

export async function listRecommendationOutcomes(params: {
  workspaceId: string;
  projectSlug?: string;
  hypothesisTitle?: string;
  limit?: number;
}): Promise<RecommendationOutcomeRow[]> {
  await ensureIntelligenceMemoryTables();

  const limit = Math.max(1, Math.min(params.limit ?? 100, 500));

  const sql = `
    SELECT
      id,
      workspace_id,
      project_slug,
      hypothesis_title,
      recommendation_title,
      outcome_status,
      outcome_note,
      impact_delta,
      created_at
    FROM recommendation_outcomes
    WHERE workspace_id = ${quote(params.workspaceId)}
    ${params.projectSlug ? `AND project_slug = ${quote(params.projectSlug)}` : ""}
    ${params.hypothesisTitle ? `AND hypothesis_title = ${quote(params.hypothesisTitle)}` : ""}
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  return prisma.$queryRawUnsafe<RecommendationOutcomeRow[]>(sql);
}