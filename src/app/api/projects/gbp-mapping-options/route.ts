import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { discoverGoogleBusinessProfileLocations } from "@/lib/integrations/google/gbp/discover-locations";
import { getLatestGbpLocationMapping } from "@/lib/integrations/google/gbp/location-mapping-ledger";

export async function GET(request: Request) {
  const session = await requireSession();
  const workspaceId = session.user?.workspaceId;

  if (!workspaceId) {
    return NextResponse.json(
      { ok: false, error: "Missing workspaceId on session." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project")?.trim() ?? "";

  if (!projectSlug) {
    return NextResponse.json(
      { ok: false, error: "Project is required." },
      { status: 400 },
    );
  }

  const savedMapping = await getLatestGbpLocationMapping({
    workspaceId,
    projectSlug,
  });

  try {
    const result = await discoverGoogleBusinessProfileLocations({ workspaceId });

    return NextResponse.json({
      ok: true,
      status: result.status,
      reason: result.reason,
      locations: result.assets.map((asset) => ({
        id: asset.sourceId,
        label: asset.displayName,
        accountName: asset.metadata.accountName,
        storeCode: asset.metadata.storeCode,
        primaryCategory: asset.metadata.primaryCategory,
        locality: asset.metadata.locality,
        regionCode: asset.metadata.regionCode,
      })),
      savedMapping,
      checkedAt: result.checkedAt,
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Google Business Profile locations could not be discovered.";

    return NextResponse.json({
      ok: false,
      error: detail,
      locations: [],
      savedMapping,
      checkedAt: new Date().toISOString(),
    });
  }
}
