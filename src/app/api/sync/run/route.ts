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

    let mapping;
    try {
      mapping = await getProjectMapping({
        workspaceId,
        ref: projectRef,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve project mapping.";

      return NextResponse.json(
        {
          ok: false,
          error: message,
          results,
        },
        { status: 500 },
      );
    }

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
        summary: results
          .map(
            (item) =>
              `${item.provider}: ${item.status} (${item.rowsSynced})${
                item.reason ? ` - ${item.reason}` : ""
              }`,
          )
          .join(" · "),
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