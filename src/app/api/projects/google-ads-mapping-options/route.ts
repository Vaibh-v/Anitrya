import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discoverGoogleAdsAccounts } from "@/lib/integrations/google/ads/discover-accounts";
import { getLatestGoogleAdsAccountMapping } from "@/lib/integrations/google/ads/account-mapping-ledger";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 },
      );
    }

    const projectRef = new URL(request.url).searchParams.get("project")?.trim();

    if (!projectRef) {
      return NextResponse.json(
        { ok: false, error: "Project is required." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        workspaceId,
        OR: [{ id: projectRef }, { slug: projectRef }, { name: projectRef }],
      },
      select: { slug: true },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 },
      );
    }

    const savedMapping = await getLatestGoogleAdsAccountMapping({
      workspaceId,
      projectSlug: project.slug,
    });

    try {
      const discovery = await discoverGoogleAdsAccounts({ workspaceId });

      return NextResponse.json({
        ok: discovery.status !== "error" && discovery.status !== "blocked",
        status: discovery.status,
        reason: discovery.reason,
        accounts: discovery.assets.map((asset) => ({
          id: asset.sourceId,
          label: asset.displayName,
          loginCustomerId: asset.metadata.loginCustomerId,
        })),
        savedMapping,
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        reason: error instanceof Error ? error.message : "Google Ads discovery failed.",
        accounts: [],
        savedMapping,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Google Ads mapping failed." },
      { status: error instanceof Error && "status" in error && error.status === 401 ? 401 : 500 },
    );
  }
}
