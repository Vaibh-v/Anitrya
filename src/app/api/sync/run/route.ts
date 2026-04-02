import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getAccessToken,
  gaListProperties,
  gaRunReport,
  gscListSites,
  gscQueryKeywords,
  ensureTabsExist,
  appendRows,
} from "@/lib/google";

import { normalizeGA4Daily } from "@/lib/normalize/ga4";
import {
  normalizeGSCDaily,
  normalizeGSCRankings,
} from "@/lib/normalize/gsc";

export async function POST() {
  try {
    const session = await requireSession();
    const token = getAccessToken(session);

    const sheetId = process.env.VSIGHT_SHEET_ID;
    if (!sheetId) throw new Error("Missing VSIGHT_SHEET_ID");

    await ensureTabsExist(token, sheetId);

    const workspaceId = "default_workspace";

    // ---------------- GA4 ----------------
    const properties = await gaListProperties(token);

    for (const prop of properties) {
      const data = await gaRunReport(token, prop.id, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "conversions" },
        ],
      });

      const rows =
        data.rows?.map((r: any) => ({
          date: r.dimensionValues?.[0]?.value,
          sessions: Number(r.metricValues?.[0]?.value ?? 0),
          users: Number(r.metricValues?.[1]?.value ?? 0),
          conversions: Number(r.metricValues?.[2]?.value ?? 0),
        })) ?? [];

      const normalized = normalizeGA4Daily({
        workspaceId,
        propertyId: prop.id,
        propertyName: prop.name,
        rows,
      });

      await appendRows(
        token,
        sheetId,
        "ga4_daily",
        normalized.map((r) => Object.values(r))
      );
    }

    // ---------------- GSC ----------------
    const sites = await gscListSites(token);

    for (const site of sites) {
      const rows = await gscQueryKeywords(token, {
        siteUrl: site.siteUrl,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });

      const daily = normalizeGSCDaily({
        workspaceId,
        siteUrl: site.siteUrl,
        rows,
      });

      const rankings = normalizeGSCRankings({
        workspaceId,
        siteUrl: site.siteUrl,
        rows,
      });

      await appendRows(
        token,
        sheetId,
        "gsc_daily",
        daily.map((r) => Object.values(r))
      );

      await appendRows(
        token,
        sheetId,
        "rankings_snapshot",
        rankings.map((r) => Object.values(r))
      );
    }

    // ---------------- SYNC LOG ----------------
    const ranAt = new Date().toISOString();

    await appendRows(token, sheetId, "sync_health", [
      [ranAt, "manual", "ok", "Full sync executed"],
    ]);

    return NextResponse.json({ ok: true, ranAt });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: e.status ?? 500 }
    );
  }
}