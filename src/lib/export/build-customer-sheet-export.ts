import type {
  BuildCustomerSheetExportInput,
  CustomerSheetExport,
} from "@/lib/export/customer-sheet-contracts";

export function buildCustomerSheetExport(
  input: BuildCustomerSheetExportInput
): CustomerSheetExport {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/edit`;

  const overviewRows: Array<Array<string | number | boolean | null>> = [
    ["project_id", "project_label", "workspace_id", "from", "to", "generated_at"],
    [
      input.projectId,
      input.projectLabel,
      input.workspaceId,
      input.from,
      input.to,
      input.generatedAt,
    ],
    [],
    ["providers_connected", "providers_ready", "evidence_ready", "intelligence_ready"],
    [
      input.projectHealth.providersConnected,
      input.projectHealth.providersReady,
      input.projectHealth.evidenceReady,
      input.projectHealth.intelligenceReady,
    ],
  ];

  const providerRows: Array<Array<string | number | boolean | null>> = [
    [
      "provider",
      "state",
      "connected",
      "mapped",
      "sync_capable",
      "evidence_ready",
      "intelligence_ready",
      "targets",
      "next_action",
      "blockers",
    ],
    ...input.providerHealth.records.map((record) => [
      record.label,
      record.state,
      record.connected,
      record.mapped,
      record.syncCapable,
      record.evidenceReady,
      record.intelligenceReady,
      record.evidenceTargets.join(", "),
      record.nextAction,
      record.blockers.join(" | "),
    ]),
  ];

  const blockerRows: Array<Array<string | number | boolean | null>> = [
    ["critical_blockers"],
    ...(input.projectHealth.criticalBlockers.length
      ? input.projectHealth.criticalBlockers.map((item) => [item])
      : [["No critical blockers recorded."]]),
    [],
    ["next_actions"],
    ...(input.projectHealth.nextActions.length
      ? input.projectHealth.nextActions.map((item) => [item])
      : [["No next actions recorded."]]),
  ];

  const metaRows: Array<Array<string | number | boolean | null>> = [
    ["summary_metric", "value"],
    ["connected_count", input.providerHealth.connectedCount],
    ["ready_count", input.providerHealth.readyCount],
    ["evidence_ready_count", input.providerHealth.evidenceReadyCount],
    ["intelligence_ready_count", input.providerHealth.intelligenceReadyCount],
  ];

  return {
    spreadsheetId: input.spreadsheetId,
    spreadsheetUrl,
    tabs: [
      { title: "workspace_overview", rows: overviewRows },
      { title: "provider_health", rows: providerRows },
      { title: "next_actions", rows: blockerRows },
      { title: "export_meta", rows: metaRows },
    ],
  };
}