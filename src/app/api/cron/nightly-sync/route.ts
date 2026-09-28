import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { projectsNeedingSync, runAutoSync } from "@/lib/sync/auto-sync";
import { isOrgWritable } from "@/lib/org/access";
import { measureDueOutcomes } from "@/lib/intelligence/outcomes";
import { exportMarketTrends } from "@/lib/intelligence/market-trends";
import { alertFounderIfNeeded } from "@/lib/ops/health";

export const maxDuration = 300;

/**
 * Vercel Cron (nightly): refreshes every workspace that nobody opened today,
 * so owner sheets and the Monday email stay current. Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await ensureAdditiveSchema();
  const started = Date.now();
  // Four-week results for recommendations customers marked as done.
  const outcomes = await measureDueOutcomes().catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  let synced = 0;
  for (const workspace of workspaces) {
    if (Date.now() - started > 240_000) break;
    if (!(await isOrgWritable(workspace.id))) continue;
    const slugs = await projectsNeedingSync(workspace.id);
    if (slugs.length === 0) continue;
    await runAutoSync(workspace.id, slugs).catch((error) => console.error("NIGHTLY_SYNC_FAILED", workspace.id, error));
    synced++;
  }
  // Cross-business seasonality directory, then the self-check (emails the founder only on problems).
  const trends = await exportMarketTrends().catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));
  const health = await alertFounderIfNeeded().catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));
  return NextResponse.json({ ok: true, workspaces: workspaces.length, synced, outcomes, trends, health });
}
