import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getGoogleAccessTokenForWorkspace } from "@/lib/google/tokens";
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

type SyncItem = {
  source: "GOOGLE_GA4" | "GOOGLE_GSC";
  status: "success" | "error" | "skipped";
  detail: string;
  rowsSynced: number;
};

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);

    const ref = asString(body?.project);
    const from = asString(body?.from);
    const to = asString(body?.to);
    const workspaceId = asString(body?.workspaceId);

    if (!ref || !from || !to || !workspaceId) {
      return NextResponse.json(
        { error: "workspaceId, project, from, and to are required." },
        { status: 400 },
      );
    }

    const mapping = await getProjectMapping({
      workspaceId,
      ref,
    });

    const accessToken = await getGoogleAccessTokenForWorkspace(
      mapping.workspaceId,
    );

    const results: SyncItem[] = [];

    if (mapping.ga4PropertyId && /^\d+$/.test(mapping.ga4PropertyId)) {
      try {
        const [sourceRows, landingRows] = await Promise.all([
          fetchGA4SourceDaily({
            accessToken,
            workspaceId: mapping.workspaceId,
            projectSlug: mapping.projectSlug,
            propertyId: mapping.ga4PropertyId,
            from,
            to,
          }),
          fetchGA4LandingPageDaily({
            accessToken,
            workspaceId: mapping.workspaceId,
            projectSlug: mapping.projectSlug,
            propertyId: mapping.ga4PropertyId,
            from,
            to,
          }),
        ]);

        const total = Number(sourceRows) + Number(landingRows);

        results.push({
          source: "GOOGLE_GA4",
          status: "success",
          detail: `${total} rows synced`,
          rowsSynced: total,
        });
      } catch (error) {
        results.push({
          source: "GOOGLE_GA4",
          status: "error",
          detail:
            error instanceof Error ? error.message : "GA4 entity sync failed.",
          rowsSynced: 0,
        });
      }
    } else {
      results.push({
        source: "GOOGLE_GA4",
        status: "skipped",
        detail: "The active project does not have a valid numeric GA4 property mapping.",
        rowsSynced: 0,
      });
    }

    if (
      mapping.gscSiteUrl &&
      (mapping.gscSiteUrl.startsWith("sc-domain:") ||
        mapping.gscSiteUrl.startsWith("http://") ||
        mapping.gscSiteUrl.startsWith("https://"))
    ) {
      try {
        const [queryRows, pageRows] = await Promise.all([
          fetchGSCQueryDaily({
            accessToken,
            workspaceId: mapping.workspaceId,
            projectSlug: mapping.projectSlug,
            siteUrl: mapping.gscSiteUrl,
            from,
            to,
          }),
          fetchGSCPageDaily({
            accessToken,
            workspaceId: mapping.workspaceId,
            projectSlug: mapping.projectSlug,
            siteUrl: mapping.gscSiteUrl,
            from,
            to,
          }),
        ]);

        const total = Number(queryRows) + Number(pageRows);

        results.push({
          source: "GOOGLE_GSC",
          status: "success",
          detail: `${total} rows synced`,
          rowsSynced: total,
        });
      } catch (error) {
        results.push({
          source: "GOOGLE_GSC",
          status: "error",
          detail:
            error instanceof Error ? error.message : "GSC entity sync failed.",
          rowsSynced: 0,
        });
      }
    } else {
      results.push({
        source: "GOOGLE_GSC",
        status: "skipped",
        detail: "The active project does not have a valid Search Console site mapping.",
        rowsSynced: 0,
      });
    }

    return NextResponse.json({
      ok: true,
      project: {
        id: mapping.projectId,
        slug: mapping.projectSlug,
        label: mapping.projectLabel,
      },
      results,
      summary: results
        .map((item) => `${item.source}: ${item.status} (${item.detail})`)
        .join(" · "),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Entity sync failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}