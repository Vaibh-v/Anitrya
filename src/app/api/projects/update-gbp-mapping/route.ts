import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discoverGoogleBusinessProfileLocations } from "@/lib/integrations/google/gbp/discover-locations";
import { recordGbpLocationMapping } from "@/lib/integrations/google/gbp/location-mapping-ledger";
import type { GoogleBusinessProfileLocationAsset } from "@/lib/integrations/google/gbp/discovery-contract";

function isGbpLocationAsset(
  asset: unknown,
): asset is GoogleBusinessProfileLocationAsset {
  if (!asset || typeof asset !== "object") return false;

  const record = asset as Record<string, unknown>;
  return (
    record.provider === "google_business_profile" &&
    record.assetKind === "business_location" &&
    typeof record.sourceId === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      project?: string;
      locationName?: string;
    };

    const projectRef = body.project?.trim();
    const locationName = body.locationName?.trim();

    if (!projectRef || !locationName) {
      return NextResponse.json(
        { ok: false, error: "Project and GBP location are required." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        workspaceId,
        OR: [{ id: projectRef }, { slug: projectRef }, { name: projectRef }],
      },
      select: {
        slug: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 },
      );
    }

    const discovery = await discoverGoogleBusinessProfileLocations({
      workspaceId,
    });
    const asset = discovery.assets
      .filter(isGbpLocationAsset)
      .find((candidate) => candidate.sourceId === locationName);

    if (!asset) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Selected Business Profile location is not available to the connected Google account.",
        },
        { status: 400 },
      );
    }

    const mapping = await recordGbpLocationMapping({
      workspaceId,
      projectSlug: project.slug,
      projectLabel: project.name,
      asset,
    });

    return NextResponse.json({
      ok: true,
      mapping,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save Business Profile mapping.",
      },
      { status: 500 },
    );
  }
}
