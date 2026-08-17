import { NextResponse } from "next/server";
import { discoverGoogleAdsAccounts } from "@/lib/integrations/google/ads/discover-accounts";
import { isMissingWorkspaceTokenError } from "@/lib/integrations/workspace-token-resolver";
import { requireAuth } from "@/lib/route-helpers";

export async function POST() {
  try {
    const { workspace } = await requireAuth();
    const result = await discoverGoogleAdsAccounts({
      workspaceId: workspace.id,
    });

    return NextResponse.json({
      ok: result.status !== "error",
      ...result,
      discovered: result.assets.length,
    });
  } catch (error: unknown) {
    if (isMissingWorkspaceTokenError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "GOOGLE_ADS_NOT_CONNECTED",
          detail:
            error instanceof Error
              ? error.message
              : "Google Ads OAuth access is missing.",
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { ok: false, error: "GOOGLE_ADS_DISCOVERY_FAILED", detail: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}
