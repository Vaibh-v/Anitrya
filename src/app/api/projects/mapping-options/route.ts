import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gaListProperties, gscListSites } from "@/lib/google";
import {
  getGoogleAnalyticsAccessTokenForWorkspace,
  getGoogleSearchConsoleAccessTokenForWorkspace,
} from "@/lib/google/tokens";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const [gaToken, gscToken] = await Promise.all([
      getGoogleAnalyticsAccessTokenForWorkspace(workspaceId),
      getGoogleSearchConsoleAccessTokenForWorkspace(workspaceId),
    ]);

    const [gaProps, gscSites] = await Promise.all([
      gaListProperties(gaToken),
      gscListSites(gscToken),
    ]);

    // 🔑 IMPORTANT: your google layer returns { id, label }
    await prisma.$transaction([
      ...gaProps.map((p) =>
        prisma.ga4Property.upsert({
          where: {
            workspaceId_propertyName: {
              workspaceId,
              propertyName: p.id, // use id directly
            },
          },
          update: {
            displayName: p.label,
          },
          create: {
            workspaceId,
            propertyName: p.id,
            displayName: p.label,
          },
        }),
      ),
      ...gscSites.map((s) =>
        prisma.gscSite.upsert({
          where: {
            workspaceId_siteUrl: {
              workspaceId,
              siteUrl: s.id,
            },
          },
          update: {
            permission: "owner", // fallback if not provided
          },
          create: {
            workspaceId,
            siteUrl: s.id,
            permission: "owner",
          },
        }),
      ),
    ]);

    const [ga, gsc] = await Promise.all([
      prisma.ga4Property.findMany({ where: { workspaceId } }),
      prisma.gscSite.findMany({ where: { workspaceId } }),
    ]);

    return NextResponse.json({
      ga4Properties: ga.map((p) => ({
        id: p.id,
        label: p.displayName || p.propertyName,
      })),
      gscSites: gsc.map((s) => ({
        id: s.id,
        label: s.siteUrl,
      })),
    });
  } catch (e) {
    console.error("mapping-options error:", e);
    return NextResponse.json(
      { error: "Failed mapping options" },
      { status: 500 },
    );
  }
}