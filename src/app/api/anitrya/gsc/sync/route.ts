import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/token";

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type GscQueryResponse = {
  rows?: GscRow[];
};

function toDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function formatDateUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const { workspace } = await requireAuth();

    const existingRun = await prisma.syncRun.findFirst({
      where: {
        workspaceId: workspace.id,
        source: "GOOGLE_GSC",
        status: "RUNNING"
      },
      orderBy: { startedAt: "desc" }
    });

    if (existingRun) {
      return NextResponse.json(
        { error: "SYNC_ALREADY_RUNNING" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken({
      workspaceId: workspace.id,
      provider: "GOOGLE_GSC"
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: "GSC_NOT_CONNECTED" },
        { status: 400 }
      );
    }

    const sites = await prisma.gscSite.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { siteUrl: "asc" }
    });

    if (sites.length === 0) {
      return NextResponse.json(
        { error: "NO_GSC_SITES" },
        { status: 400 }
      );
    }

    const run = await prisma.syncRun.create({
      data: {
        workspaceId: workspace.id,
        source: "GOOGLE_GSC",
        status: "RUNNING",
        rowsSynced: 0,
        metadata: {
          sitesRequested: sites.length,
          range: "28d",
          dimension: "date"
        }
      }
    });

    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() - 1);

    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 27);

    let rowsSynced = 0;
    let sitesProcessed = 0;
    let sitesWithNoRows = 0;

    const perSiteSummary: Array<{
      siteUrl: string;
      rowsReturned: number;
      firstDate: string | null;
      lastDate: string | null;
    }> = [];

    for (const site of sites) {
      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            startDate: formatDateUTC(startDate),
            endDate: formatDateUTC(endDate),
            dimensions: ["date"],
            rowLimit: 25000
          })
        }
      );

      const json = (await res.json()) as GscQueryResponse | { error?: unknown };

      if (!res.ok) {
        await prisma.syncRun.update({
          where: { id: run.id },
          data: {
            status: "ERROR",
            error: JSON.stringify(json),
            endedAt: new Date(),
            rowsSynced,
            metadata: {
              sitesRequested: sites.length,
              sitesProcessed,
              sitesWithNoRows,
              failedSite: site.siteUrl
            }
          }
        });

        return NextResponse.json(
          { error: "GSC_SYNC_FAILED", detail: json },
          { status: 500 }
        );
      }

      const rows = (json as GscQueryResponse).rows ?? [];
      sitesProcessed += 1;

      if (rows.length === 0) {
        sitesWithNoRows += 1;
      }

      let firstDate: string | null = null;
      let lastDate: string | null = null;

      for (const row of rows) {
        const dateKey = row.keys?.[0];
        if (!dateKey) continue;

        if (!firstDate) firstDate = dateKey;
        lastDate = dateKey;

        await prisma.gscDailyMetric.upsert({
          where: {
            siteId_date: {
              siteId: site.id,
              date: toDateOnly(dateKey)
            }
          },
          update: {
            clicks: row.clicks ?? 0,
            impressions: row.impressions ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0
          },
          create: {
            workspaceId: workspace.id,
            siteId: site.id,
            date: toDateOnly(dateKey),
            clicks: row.clicks ?? 0,
            impressions: row.impressions ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0
          }
        });

        rowsSynced += 1;
      }

      perSiteSummary.push({
        siteUrl: site.siteUrl,
        rowsReturned: rows.length,
        firstDate,
        lastDate
      });
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        rowsSynced,
        endedAt: new Date(),
        metadata: {
          sitesRequested: sites.length,
          sitesProcessed,
          sitesWithNoRows,
          range: "28d",
          dimension: "date",
          endDate: formatDateUTC(endDate),
          perSiteSummary
        }
      }
    });

    return NextResponse.json({
      ok: true,
      rowsSynced,
      sitesProcessed,
      sitesWithNoRows,
      perSiteSummary
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}