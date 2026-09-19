import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discoverGoogleAdsAccounts } from "@/lib/integrations/google/ads/discover-accounts";
import { recordGoogleAdsAccountMapping } from "@/lib/integrations/google/ads/account-mapping-ledger";
import type { GoogleAdsAccountAsset } from "@/lib/integrations/google/ads/discovery-contract";

function isGoogleAdsAccountAsset(
  asset: unknown,
): asset is GoogleAdsAccountAsset {
  if (!asset || typeof asset !== "object") return false;

  const record = asset as Record<string, unknown>;
  return (
    record.provider === "google_ads" &&
    record.assetKind === "ads_account" &&
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
      customerId?: string;
      resourceName?: string;
    };

    const projectRef = body.project?.trim();
    const customerRef = (body.resourceName ?? body.customerId)?.trim();

    if (!projectRef || !customerRef) {
      return NextResponse.json(
        { ok: false, error: "Project and Google Ads customer are required." },
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

    const normalizedCustomerId = customerRef.replace(/^customers\//, "");
    const discovery = await discoverGoogleAdsAccounts({ workspaceId });
    const asset = discovery.assets
      .filter(isGoogleAdsAccountAsset)
      .find(
        (candidate) =>
          candidate.sourceId === customerRef ||
          candidate.metadata.customerId === normalizedCustomerId,
      );

    if (!asset) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Selected Google Ads customer is not available to the connected Google account.",
        },
        { status: 400 },
      );
    }

    const mapping = await recordGoogleAdsAccountMapping({
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
            : "Failed to save Google Ads mapping.",
      },
      { status: 500 },
    );
  }
}
