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

type OwnerSheetResult =
  | {
      status: "mirrored";
      masterSpreadsheetId: string;
      customerSpreadsheetId: string;
      summary: string;
    }
  | {
      status: "skipped";
      reason: string;
      summary: string;
    }
  | {
      status: "error";
      reason: string;
      summary: string;
    };

type IntelligenceResultSummary =
  | {
      status: "generated";
      insights: number;
      recommendations: number;
      exportStatus: "mirrored" | "skipped" | "error";
      masterSpreadsheetId?: string;
      customerSpreadsheetId?: string;
      exportError?: string;
    }
  | {
      status: "error";
      error: string;
    };

function hasOwnerSheetServiceAccountConfig() {
  const clientEmail =
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

  return Boolean(clientEmail?.trim() && privateKey?.trim());
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

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

    let ownerSheet: OwnerSheetResult = {
      status: "skipped",
      reason:
        "GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY are not configured.",
      summary:
        "OWNER_SHEET: skipped - service-account credentials are not configured.",
    };

    if (hasOwnerSheetServiceAccountConfig()) {
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

        ownerSheet = {
          status: "mirrored",
          masterSpreadsheetId: ownerExport.masterSpreadsheetId,
          customerSpreadsheetId: ownerExport.customerSheetId,
          summary: `OWNER_SHEET: mirrored to ${ownerExport.customerSheetId}`,
        };
      } catch (ownerExportError) {
        console.error("OWNER_EXPORT_FAILED", ownerExportError);
        const reason = getErrorMessage(
          ownerExportError,
          "Owner-sheet export failed after sync.",
        );

        ownerSheet = {
          status: "error",
          reason,
          summary: `OWNER_SHEET: failed - ${reason}`,
        };
      }
    }

    let intelligence: IntelligenceResultSummary | null = null;

    try {
      const intelligenceResult = await runIntelligence({
        workspaceId: mapping.workspaceId,
        projectId: mapping.projectId,
        projectSlug: mapping.projectSlug,
        projectLabel: mapping.projectLabel,
        from,
        to,
      });

      intelligence = {
        status: "generated",
        insights: intelligenceResult.insights.length,
        recommendations: intelligenceResult.recommendations.length,
        exportStatus: "skipped",
      };

      if (hasOwnerSheetServiceAccountConfig()) {
        try {
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

          intelligence = {
            ...intelligence,
            exportStatus: "mirrored",
            masterSpreadsheetId: intelligenceExport.masterSpreadsheetId,
            customerSpreadsheetId: intelligenceExport.customerSpreadsheetId,
          };
        } catch (intelligenceExportError) {
          console.error("INTELLIGENCE_EXPORT_FAILED", intelligenceExportError);
          intelligence = {
            ...intelligence,
            exportStatus: "error",
            exportError: getErrorMessage(
              intelligenceExportError,
              "Intelligence export failed.",
            ),
          };
        }
      }
    } catch (intelligenceError) {
      console.error("INTELLIGENCE_GENERATION_FAILED", intelligenceError);
      intelligence = {
        status: "error",
        error: getErrorMessage(intelligenceError, "Intelligence failed."),
      };
    }

    const syncOk = results.every((result) => result.status !== "error");
    const ok = syncOk && ownerSheet.status !== "error";

    const intelligenceSummary =
      intelligence?.status === "generated"
        ? `INTELLIGENCE: ${intelligence.insights} insight(s) · ${intelligence.recommendations} recommendation(s) · EXPORT: ${intelligence.exportStatus}`
        : intelligence?.status === "error"
          ? `INTELLIGENCE: failed - ${intelligence.error}`
          : "INTELLIGENCE: not run";

    return NextResponse.json(
      {
        ok,
        project: {
          id: mapping.projectId,
          slug: mapping.projectSlug,
          label: mapping.projectLabel,
        },
        results,
        ownerSheet,
        intelligence,
        summary:
          results
            .map(
              (item) =>
                `${item.provider}: ${item.status} (${item.rowsSynced})${
                  item.reason ? ` - ${item.reason}` : ""
                }`,
            )
            .join(" · ") +
          ` · ${ownerSheet.summary}` +
          ` · ${intelligenceSummary}`,
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
