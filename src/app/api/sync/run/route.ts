import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import type { IntegrationSyncResult } from "@/lib/integrations/sync-contracts";
import { runProjectIntegrationSyncs } from "@/lib/integrations/run-project-integration-syncs";
import { exportNormalizedProjectDataToOwnerSheet } from "@/lib/intelligence/owner-network/export-normalized-project-data";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";
import { exportIntelligenceToSheets } from "@/lib/intelligence/owner-network/export-intelligence-to-sheets";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

type SyncResult = IntegrationSyncResult;

export async function POST(req: NextRequest) {
  const results: SyncResult[] = [];

  try {
    const session = await requireSession();
    const workspaceId = asString(session.user?.workspaceId);

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No active workspace found for this session.",
          results,
        },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);

    const projectRef =
      asString(body?.project) ??
      asString(body?.projectSlug) ??
      asString(body?.projectId);
    const from = asString(body?.from);
    const to = asString(body?.to);

    if (!projectRef || !from || !to) {
      return NextResponse.json(
        {
          ok: false,
          error: "project, from, and to are required.",
          results,
        },
        { status: 400 },
      );
    }

    const mapping = await getProjectMapping({
      workspaceId,
      ref: projectRef,
    });

    results.push(
      ...(await runProjectIntegrationSyncs({
        workspaceId,
        mapping,
        from,
        to,
      })),
    );

    let ownerSheetMessage = "";
    let intelligenceSummaryMessage = "";
    let intelligenceResultSummary: {
      insights: number;
      recommendations: number;
      masterSpreadsheetId: string;
      customerSpreadsheetId: string;
    } | null = null;

    try {
      const ownerExport = await exportNormalizedProjectDataToOwnerSheet({
        workspaceId: mapping.workspaceId,
        projectId: mapping.projectId,
        projectSlug: mapping.projectSlug,
        projectLabel: mapping.projectLabel,
        ga4PropertyRecordId: mapping.ga4PropertyRecordId,
        ga4PropertyId: mapping.ga4PropertyId,
        ga4PropertyLabel: mapping.ga4PropertyLabel,
        gscSiteRecordId: mapping.gscSiteRecordId,
        gscSiteUrl: mapping.gscSiteUrl,
        from,
        to,
        results,
      });

      ownerSheetMessage = ` · OWNER_SHEET: mirrored to ${ownerExport.customerSheetId}`;

      try {
        const intelligenceResult = await runIntelligence({
          workspaceId: mapping.workspaceId,
          projectId: mapping.projectId,
          projectSlug: mapping.projectSlug,
          projectLabel: mapping.projectLabel,
          from,
          to,
        });

        const intelligenceExport = await exportIntelligenceToSheets({
          run: {
            workspaceId: mapping.workspaceId,
            projectId: mapping.projectId,
            projectSlug: mapping.projectSlug,
            projectLabel: mapping.projectLabel,
            from,
            to,
          },
          output: intelligenceResult,
        });

        intelligenceResultSummary = {
          insights: intelligenceResult.insights.length,
          recommendations: intelligenceResult.recommendations.length,
          masterSpreadsheetId: intelligenceExport.masterSpreadsheetId,
          customerSpreadsheetId: intelligenceExport.customerSpreadsheetId,
        };

        intelligenceSummaryMessage = ` · INTELLIGENCE: ${intelligenceResult.insights.length} insight(s) · ${intelligenceResult.recommendations.length} recommendation(s)`;
      } catch (intelligenceError) {
        console.error("Intelligence failed after sync:", intelligenceError);
        intelligenceSummaryMessage = " · INTELLIGENCE: failed";
      }
    } catch (ownerExportError) {
      console.error("OWNER EXPORT FAILED:", ownerExportError);
      console.error(
        "OWNER EXPORT STACK:",
        ownerExportError instanceof Error
          ? ownerExportError.stack
          : String(ownerExportError),
      );

      const details =
        ownerExportError instanceof Error
          ? `${ownerExportError.message}\n${ownerExportError.stack ?? ""}`
          : String(ownerExportError);

      return NextResponse.json(
        {
          ok: false,
          error: "Owner-sheet export failed.",
          details,
          results,
        },
        { status: 500 },
      );
    }

    const ok = results.every((result) => result.status !== "error");

    return NextResponse.json(
      {
        ok,
        project: {
          id: mapping.projectId,
          slug: mapping.projectSlug,
          label: mapping.projectLabel,
        },
        results,
        intelligence: intelligenceResultSummary,
        summary:
          results
            .map(
              (item) =>
                `${item.provider}: ${item.status} (${item.rowsSynced})${
                  item.reason ? ` - ${item.reason}` : ""
                }`,
            )
            .join(" · ") +
          ownerSheetMessage +
          intelligenceSummaryMessage,
      },
      { status: ok ? 200 : 207 },
    );
  } catch (error) {
    console.error("Sync route fatal error:", error);

    const message =
      error instanceof Error ? error.message : "Entity sync failed.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        results,
      },
      { status: 500 },
    );
  }
}
