import { buildProviderHealthSummary } from "@/lib/integrations/provider-health-service";
import type { ProjectIntegrationHealth } from "@/lib/integrations/provider-health-contracts";

export async function buildProjectIntegrationHealth(input: {
  workspaceId: string | null;
  projectId: string;
}): Promise<ProjectIntegrationHealth> {
  if (!input.workspaceId) {
    return {
      projectId: input.projectId,
      workspaceId: null,
      providersConnected: 0,
      providersReady: 0,
      evidenceReady: 0,
      intelligenceReady: 0,
      criticalBlockers: ["Workspace is missing, so provider health cannot be resolved."],
      nextActions: ["Resolve workspace identity before attempting sync or export."],
      records: [],
    };
  }

  const summary = await buildProviderHealthSummary(input.workspaceId, input.projectId);

  const criticalBlockers = summary.records
    .flatMap((record) => record.blockers)
    .filter((blocker, index, array) => array.indexOf(blocker) === index)
    .slice(0, 6);

  const nextActions = summary.records
    .map((record) => record.nextAction)
    .filter((action, index, array) => array.indexOf(action) === index)
    .slice(0, 6);

  return {
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    providersConnected: summary.connectedCount,
    providersReady: summary.readyCount,
    evidenceReady: summary.evidenceReadyCount,
    intelligenceReady: summary.intelligenceReadyCount,
    criticalBlockers,
    nextActions,
    records: summary.records,
  };
}