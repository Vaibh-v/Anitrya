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

    const [ga, gsc, projects] = await Promise.all([
      prisma.ga4Property.findMany({ where: { workspaceId } }),
      prisma.gscSite.findMany({ where: { workspaceId } }),
      prisma.project.findMany({ where: { workspaceId }, select: { ga4PropertyId: true } }),
    ]);

    // Older syncs stored GA4 properties as "properties/123" while discovery
    // stores "123", so the same property appeared twice. Show one option per
    // GA4 property id: prefer the record a project already uses, then the
    // record created by current discovery.
    const inUse = new Set(projects.map((project) => project.ga4PropertyId).filter(Boolean));
    const bareId = (name: string) => name.replace(/^properties\//, "").trim();
    const labelById = new Map(gaProps.map((p) => [p.id, p.label]));
    const byPropertyId = new Map<string, (typeof ga)[number]>();
    for (const record of ga) {
      const id = bareId(record.propertyName);
      const current = byPropertyId.get(id);
      const score = (r: (typeof ga)[number]) =>
        (inUse.has(r.id) ? 2 : 0) + (r.propertyName === id ? 1 : 0);
      if (!current || score(record) > score(current)) byPropertyId.set(id, record);
    }

    return NextResponse.json({
      ga4Properties: [...byPropertyId.entries()]
        .map(([propertyId, p]) => ({
          id: p.id,
          label:
            labelById.get(propertyId) ??
            `${p.displayName && !p.displayName.includes(propertyId) ? p.displayName : "GA4 property"} (${propertyId})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
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