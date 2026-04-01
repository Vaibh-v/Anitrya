import type { ProjectDiagnostics, ProjectEvidence } from "@/lib/evidence/types";
import { computeProjectDiagnostics } from "@/lib/intelligence/compute-intelligence";

export function getProjectDiagnostics(
  evidence: ProjectEvidence
): ProjectDiagnostics {
  return computeProjectDiagnostics(evidence);
}