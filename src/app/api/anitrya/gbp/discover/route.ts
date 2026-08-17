import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { discoverGoogleBusinessProfileLocations } from "@/lib/integrations/google/gbp/discover-locations";
import { isMissingWorkspaceTokenError } from "@/lib/integrations/workspace-token-resolver";

export async function POST() {
  try {
    const { workspace } = await requireAuth();
    const result = await discoverGoogleBusinessProfileLocations({
      workspaceId: workspace.id,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      discovered: result.assets.length,
    });
  } catch (error: unknown) {
    if (isMissingWorkspaceTokenError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "GBP_NOT_CONNECTED",
          detail:
            error instanceof Error
              ? error.message
              : "Google Business Profile OAuth access is missing.",
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { ok: false, error: "GBP_DISCOVERY_FAILED", detail: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}
