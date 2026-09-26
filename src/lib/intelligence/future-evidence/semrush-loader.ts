/**
 * Server-side loader for the SEMrush intelligence evidence input.
 * Never throws: missing table / no data / query failure => state "missing".
 */
import { readLatestSemrushEvidence } from "@/lib/integrations/semrush/semrush-evidence-store";
import {
  buildSemrushIntelligenceEvidence,
  type SemrushIntelligenceEvidence,
} from "@/lib/intelligence/future-evidence/semrush";

export async function loadSemrushIntelligenceEvidence(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}): Promise<SemrushIntelligenceEvidence> {
  const rows = await readLatestSemrushEvidence(input);
  return buildSemrushIntelligenceEvidence(rows);
}
