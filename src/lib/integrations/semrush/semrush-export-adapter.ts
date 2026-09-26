/**
 * SEMrush export adapter — turns stored SEMrush evidence into sheet rows for
 * owner and customer exports.
 *
 * Contract: returns null when there is no SEMrush data for the project/window
 * (or storage is missing). Callers must write the SEMrush tab ONLY when this
 * returns a non-null value, so exports for projects without SEMrush are
 * unchanged.
 */
import { readLatestSemrushEvidence } from "@/lib/integrations/semrush/semrush-evidence-store";
import {
  buildSemrushExportDataset,
  type SemrushExportDataset,
} from "@/lib/integrations/semrush/semrush-export-format";

export {
  buildSemrushExportDataset,
  semrushRowToExportCells,
  type SemrushExportDataset,
  type SemrushExportStatus,
} from "@/lib/integrations/semrush/semrush-export-format";

/** Server: load + build. Never throws. */
export async function loadSemrushExportDataset(input: {
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  /** Optional leading columns, e.g. workspace/project identifiers for the owner mirror. */
  prefix?: Record<string, string>;
}): Promise<SemrushExportDataset | null> {
  const rows = await readLatestSemrushEvidence({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    from: input.from,
    to: input.to,
  });

  return buildSemrushExportDataset(rows, { prefix: input.prefix });
}
