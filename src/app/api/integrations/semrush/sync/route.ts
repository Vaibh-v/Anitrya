import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import type { IntegrationSyncResult } from "@/lib/integrations/sync-contracts";
import { recordIntegrationSyncResult } from "@/lib/integrations/sync-audit";
import { runSemrushSync } from "@/lib/integrations/connectors/semrush-sync";

export const dynamic = "force-dynamic";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/integrations/semrush/sync  { project, from, to, force? }
 *
 * Runs ONLY the SEMrush runner for one project — independent of the full
 * /api/sync/run orchestration (no GA4/GSC/Ads/GBP calls, no owner export,
 * no intelligence run). Always returns a visible skipped/error/success result.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = asString(session.user?.workspaceId);

    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "Missing workspaceId on session." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const projectRef = asString(body.project) ?? asString(body.projectSlug) ?? asString(body.projectId);
    const from = asString(body.from);
    const to = asString(body.to);
    const force = body.force === true;

    if (!projectRef || !from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
      return NextResponse.json(
        { ok: false, error: "project, from (YYYY-MM-DD) and to (YYYY-MM-DD) are required." },
        { status: 400 },
      );
    }

    const mapping = await getProjectMapping({ workspaceId, ref: projectRef });
    const context = { workspaceId, mapping, from, to };

    let result: IntegrationSyncResult;
    try {
      result = await runSemrushSync(context, { force });
    } catch (error) {
      console.error("SEMRUSH sync error:", error);
      result = {
        provider: "SEMRUSH",
        status: "error",
        reason: error instanceof Error ? error.message : "SEMrush sync failed.",
        rowsSynced: 0,
      };
    }

    await recordIntegrationSyncResult({ context, result });

    return NextResponse.json(
      {
        ok: result.status !== "error",
        project: { id: mapping.projectId, slug: mapping.projectSlug, label: mapping.projectLabel },
        result,
      },
      { status: result.status === "error" ? 502 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "SEMrush sync failed." },
      { status: 500 },
    );
  }
}
