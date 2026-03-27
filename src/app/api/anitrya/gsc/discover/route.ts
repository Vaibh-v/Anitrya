import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/token";

type GscSiteEntry = {
  siteUrl?: string;
  permissionLevel?: string;
};

type GscSitesResponse = {
  siteEntry?: GscSiteEntry[];
};

export async function POST() {
  try {
    const { workspace } = await requireAuth();

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

    const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const json = (await res.json()) as GscSitesResponse;

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "GSC_DISCOVERY_FAILED",
          detail: JSON.stringify(json)
        },
        { status: 500 }
      );
    }

    const sites = json.siteEntry ?? [];

    for (const site of sites) {
      if (!site.siteUrl) continue;

      await prisma.gscSite.upsert({
        where: {
          workspaceId_siteUrl: {
            workspaceId: workspace.id,
            siteUrl: site.siteUrl
          }
        },
        update: {
          permission: site.permissionLevel ?? null
        },
        create: {
          workspaceId: workspace.id,
          siteUrl: site.siteUrl,
          permission: site.permissionLevel ?? null
        }
      });
    }

    return NextResponse.json({
      ok: true,
      discovered: sites.length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}