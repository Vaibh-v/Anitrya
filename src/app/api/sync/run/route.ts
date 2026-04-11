import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getGoogleAnalyticsAccessTokenForWorkspace,
  getGoogleSearchConsoleAccessTokenForWorkspace,
} from "@/lib/google/tokens";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { fetchGA4SourceDaily } from "@/lib/integrations/google/ga4/fetch-ga4-source-daily";
import { fetchGA4LandingPageDaily } from "@/lib/integrations/google/ga4/fetch-ga4-landing";
import { fetchGSCQueryDaily } from "@/lib/integrations/google/gsc/fetch-gsc-query";
import { fetchGSCPageDaily } from "@/lib/integrations/google/gsc/fetch-gsc-page";
import { exportNormalizedProjectDataToOwnerSheet } from "@/lib/intelligence/owner-network/export-normalized-project-data";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";
import { exportIntelligenceToSheets } from "@/lib/intelligence/owner-network/export-intelligence-to-sheets";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

type SyncResult = {
  provider: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: "success" | "error" | "skipped";
  reason: string;
  rowsSynced: number;
};

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

    if (mapping.ga4PropertyId) {
      try {
        const accessToken =
          await getGoogleAnalyticsAccessTokenForWorkspace(workspaceId);

        const [sourceRows, landingRows] = await Promise.all([
          fetchGA4SourceDaily({
            workspaceId,
            projectSlug: mapping.projectSlug,
            propertyId: mapping.ga4PropertyId,
            accessToken,
            from,
            to,
          }),
          fetchGA4LandingPageDaily({
            workspaceId,
            projectSlug: mapping.projectSlug,
            propertyId: mapping.ga4PropertyId,
            accessToken,
            from,
            to,
          }),
        ]);

        const total = sourceRows + landingRows;

        results.push({
          provider: "GOOGLE_GA4",
          status: "success",
          reason: `${total} rows synced`,
          rowsSynced: total,
        });
      } catch (error) {
        console.error("GA4 sync error:", error);

        results.push({
          provider: "GOOGLE_GA4",
          status: "error",
          reason:
            error instanceof Error ? error.message : "GA4 entity sync failed.",
          rowsSynced: 0,
        });
      }
    } else {
      results.push({
        provider: "GOOGLE_GA4",
        status: "skipped",
        reason: "This project does not have a mapped GA4 property.",
        rowsSynced: 0,
      });
    }

    if (mapping.gscSiteUrl) {
      try {
        const accessToken =
          await getGoogleSearchConsoleAccessTokenForWorkspace(workspaceId);

        const [queryRows, pageRows] = await Promise.all([
          fetchGSCQueryDaily({
            workspaceId,
            projectSlug: mapping.projectSlug,
            siteUrl: mapping.gscSiteUrl,
            accessToken,
            from,
            to,
          }),
          fetchGSCPageDaily({
            workspaceId,
            projectSlug: mapping.projectSlug,
            siteUrl: mapping.gscSiteUrl,
            accessToken,
            from,
            to,
          }),
        ]);

        const total = queryRows + pageRows;

        results.push({
          provider: "GOOGLE_GSC",
          status: "success",
          reason: `${total} rows synced`,
          rowsSynced: total,
        });
      } catch (error) {
        console.error("GSC sync error:", error);

        results.push({
          provider: "GOOGLE_GSC",
          status: "error",
          reason:
            error instanceof Error ? error.message : "GSC entity sync failed.",
          rowsSynced: 0,
        });
      }
    } else {
      results.push({
        provider: "GOOGLE_GSC",
        status: "skipped",
        reason: "This project does not have a mapped Search Console site.",
        rowsSynced: 0,
      });
    }

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