import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gaListProperties, gscListSites } from "@/lib/google";
import { getWorkspaceGoogleAccessToken } from "@/lib/google/tokens";
import { getProjectMapping } from "@/lib/project/project-mapper";

function asRef(req: NextRequest): string | null {
  const value = req.nextUrl.searchParams.get("project");
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const ref = asRef(req);

    const project = await prisma.project.findFirst({
      where: ref
        ? {
            OR: [{ id: ref }, { slug: ref }, { name: ref }],
          }
        : undefined,
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        workspaceId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          project: null,
          ga4Properties: [],
          gscSites: [],
          error: "Project not found.",
        },
        { status: 404 },
      );
    }

    const resolved = await getProjectMapping({
      workspaceId: project.workspaceId,
      ref: project.id,
    });

    try {
      const accessToken = await getWorkspaceGoogleAccessToken(project.workspaceId);

      const [ga4Properties, gscSites] = await Promise.all([
        gaListProperties(accessToken),
        gscListSites(accessToken),
      ]);

      const ga4Merged = [...ga4Properties];
      if (
        resolved.ga4PropertyId &&
        !ga4Merged.some((item) => item.id === resolved.ga4PropertyId)
      ) {
        ga4Merged.unshift({
          id: resolved.ga4PropertyId,
          label:
            resolved.ga4PropertyLabel ??
            `Saved property (${resolved.ga4PropertyId})`,
        });
      }

      const gscMerged = [...gscSites];
      if (
        resolved.gscSiteUrl &&
        !gscMerged.some((item) => item.id === resolved.gscSiteUrl)
      ) {
        gscMerged.unshift({
          id: resolved.gscSiteUrl,
          label: resolved.gscSiteLabel ?? resolved.gscSiteUrl,
        });
      }

      return NextResponse.json({
        project: {
          id: project.id,
          slug: project.slug,
          name: project.name,
          workspaceId: project.workspaceId,
          ga4PropertyId: resolved.ga4PropertyId,
          gscSiteId: resolved.gscSiteUrl,
        },
        ga4Properties: ga4Merged,
        gscSites: gscMerged,
        error: null,
      });
    } catch (tokenOrGoogleError) {
      const fallbackGA4 =
        resolved.ga4PropertyId && resolved.ga4PropertyLabel
          ? [
              {
                id: resolved.ga4PropertyId,
                label: resolved.ga4PropertyLabel,
              },
            ]
          : [];

      const fallbackGSC =
        resolved.gscSiteUrl && resolved.gscSiteLabel
          ? [
              {
                id: resolved.gscSiteUrl,
                label: resolved.gscSiteLabel,
              },
            ]
          : [];

      const message =
        tokenOrGoogleError instanceof Error
          ? tokenOrGoogleError.message
          : "Unable to load live Google mapping options.";

      return NextResponse.json({
        project: {
          id: project.id,
          slug: project.slug,
          name: project.name,
          workspaceId: project.workspaceId,
          ga4PropertyId: resolved.ga4PropertyId,
          gscSiteId: resolved.gscSiteUrl,
        },
        ga4Properties: fallbackGA4,
        gscSites: fallbackGSC,
        error: message,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load mapping options.";

    return NextResponse.json(
      {
        project: null,
        ga4Properties: [],
        gscSites: [],
        error: message,
      },
      { status: 500 },
    );
  }
}