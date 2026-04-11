import {
  appendRows,
  clearAndWriteSheet,
  ensureSheetStructure,
  readSheetValues,
} from "@/lib/intelligence/owner-network/google-sheets";
import { ensureOwnerCustomerSheet } from "@/lib/intelligence/owner-network/customer-sheet-network";
import { INTELLIGENCE_HEADERS } from "@/lib/intelligence/owner-network/intelligence-sheet-headers";
import type {
  IntelligenceRunInput,
  IntelligenceRunOutput,
} from "@/lib/intelligence/contracts";

const INTELLIGENCE_TABS = {
  insightsGenerated: "insights_generated",
  recommendations: "recommendations",
} as const;

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function buildRunKey(run: IntelligenceRunInput) {
  return `${run.workspaceId}__${run.projectId}__${run.from}__${run.to}`;
}

function toMutableHeaders(values: readonly string[]) {
  return [...values];
}

function matchesRunKey(row: string[], runKeyIndex: number, runKey: string) {
  return (row[runKeyIndex] ?? "") === runKey;
}

async function replaceRowsForRun(args: {
  spreadsheetId: string;
  tabName: string;
  headers: string[];
  rowsToAppend: string[][];
  runKey: string;
}) {
  const { spreadsheetId, tabName, headers, rowsToAppend, runKey } = args;

  const existing = await readSheetValues(spreadsheetId, tabName);
  const headerRow =
    existing[0] && existing[0].length > 0 ? existing[0] : headers.slice();

  const runKeyIndex = headerRow.indexOf("run_key");

  const retainedRows =
    runKeyIndex >= 0
      ? existing
          .slice(1)
          .filter((row) => !matchesRunKey(row, runKeyIndex, runKey))
      : existing.slice(1);

  const nextRows = [headerRow, ...retainedRows, ...rowsToAppend];

  await clearAndWriteSheet(spreadsheetId, tabName, nextRows);
}

export async function exportIntelligenceToSheets(input: {
  run: IntelligenceRunInput;
  output: IntelligenceRunOutput;
}) {
  const { run, output } = input;

  const network = await ensureOwnerCustomerSheet(run.workspaceId);
  const runKey = buildRunKey(run);

  const insightHeaders = toMutableHeaders(INTELLIGENCE_HEADERS.insightsGenerated);
  const recommendationHeaders = toMutableHeaders(
    INTELLIGENCE_HEADERS.recommendations,
  );

  const schema: Record<string, string[]> = {
    [INTELLIGENCE_TABS.insightsGenerated]: insightHeaders,
    [INTELLIGENCE_TABS.recommendations]: recommendationHeaders,
  };

  await ensureSheetStructure(network.masterSpreadsheetId, schema);
  await ensureSheetStructure(network.customerSpreadsheetId, schema);

  const insightRows = output.insights.map((insight) => [
    insight.insightId,
    insight.runKey,
    insight.workspaceId,
    insight.projectId,
    insight.projectSlug,
    insight.projectLabel,
    insight.analysisWindowFrom,
    insight.analysisWindowTo,
    insight.category,
    insight.severity,
    String(insight.hypothesisRank),
    String(insight.priorityScore),
    String(insight.impactEstimatedClicks),
    insight.evidenceSummary,
    insight.missingDataReason,
    insight.title,
    insight.finding,
    insight.rationale,
    stringify(insight.evidence),
    insight.recommendedAction,
    insight.dataSufficiency,
    stringify(insight.missingData),
    insight.modelProvider,
    insight.modelVersion,
    insight.generatedAt,
  ]);

  const recommendationRows = output.recommendations.map((recommendation) => [
    recommendation.recommendationId,
    recommendation.runKey,
    recommendation.insightId,
    recommendation.workspaceId,
    recommendation.projectId,
    recommendation.projectSlug,
    String(recommendation.priority),
    String(recommendation.priorityScore),
    String(recommendation.impactEstimatedClicks),
    recommendation.evidenceSummary,
    recommendation.title,
    recommendation.action,
    recommendation.expectedOutcome,
    stringify(recommendation.evidence),
    recommendation.generatedAt,
  ]);

  if (insightRows.length > 0) {
    await replaceRowsForRun({
      spreadsheetId: network.masterSpreadsheetId,
      tabName: INTELLIGENCE_TABS.insightsGenerated,
      headers: insightHeaders,
      rowsToAppend: insightRows,
      runKey,
    });

    await replaceRowsForRun({
      spreadsheetId: network.customerSpreadsheetId,
      tabName: INTELLIGENCE_TABS.insightsGenerated,
      headers: insightHeaders,
      rowsToAppend: insightRows,
      runKey,
    });
  }

  if (recommendationRows.length > 0) {
    await replaceRowsForRun({
      spreadsheetId: network.masterSpreadsheetId,
      tabName: INTELLIGENCE_TABS.recommendations,
      headers: recommendationHeaders,
      rowsToAppend: recommendationRows,
      runKey,
    });

    await replaceRowsForRun({
      spreadsheetId: network.customerSpreadsheetId,
      tabName: INTELLIGENCE_TABS.recommendations,
      headers: recommendationHeaders,
      rowsToAppend: recommendationRows,
      runKey,
    });
  }

  return {
    masterSpreadsheetId: network.masterSpreadsheetId,
    customerSpreadsheetId: network.customerSpreadsheetId,
    insightsWritten: insightRows.length,
    recommendationsWritten: recommendationRows.length,
  };
}