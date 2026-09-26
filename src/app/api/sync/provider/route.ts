import { NextRequest, NextResponse } from "next/server";
import { handleProjectProviderSync } from "@/lib/integrations/handle-project-provider-sync";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import type { IntegrationSyncProvider } from "@/lib/integrations/sync-contracts";

// Large properties page through several API responses; allow the full serverless budget.
export const maxDuration = 300;

const PROVIDERS: Record<string, IntegrationSyncProvider> = {
  ga4: "GOOGLE_GA4",
  gsc: "GOOGLE_GSC",
  "google-ads": "GOOGLE_ADS",
  gbp: "GOOGLE_GBP",
  semrush: "SEMRUSH",
};

/**
 * POST /api/sync/provider?source=ga4|gsc|google-ads|gbp|semrush
 * Body: { project, from, to }
 *
 * Runs exactly one project-scoped server-side sync runner (the same runners
 * /api/sync/run uses) and records the audit row. Used by the settings panels
 * right after a mapping is saved. Unlike the legacy /api/anitrya/{ga4,gsc}/sync
 * routes it writes project-scoped normalized evidence and returns { ok, result }.
 */
export async function POST(request: NextRequest) {
  await ensureAdditiveSchema();
  const source = request.nextUrl.searchParams.get("source") ?? "";
  const provider = PROVIDERS[source];

  if (!provider) {
    return NextResponse.json(
      { ok: false, error: `Unsupported source "${source}".` },
      { status: 400 },
    );
  }

  return handleProjectProviderSync(request, provider);
}
