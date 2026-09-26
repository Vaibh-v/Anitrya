import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import {
  claimAutoSync,
  isAutoSyncRunning,
  projectsNeedingSync,
  releaseAutoSync,
  runAutoSync,
} from "@/lib/sync/auto-sync";

// The staged background run (7 → 28 → 90 days) needs the full serverless budget.
export const maxDuration = 300;

async function workspace() {
  const session = await getServerSession(authOptions);
  return session?.user?.workspaceId ?? null;
}

/** Status for the top-bar indicator. */
export async function GET() {
  const workspaceId = await workspace();
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  await ensureAdditiveSchema();
  return NextResponse.json({ ok: true, running: await isAutoSyncRunning(workspaceId) });
}

/**
 * Called once when a signed-in user opens the app. Responds immediately; the
 * sync itself runs after the response, so login is never slowed down.
 */
export async function POST() {
  const workspaceId = await workspace();
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  await ensureAdditiveSchema();

  const slugs = await projectsNeedingSync(workspaceId);
  if (slugs.length === 0) return NextResponse.json({ ok: true, status: "fresh" });

  const claim = await claimAutoSync(workspaceId);
  if (!claim) return NextResponse.json({ ok: true, status: "running" });

  after(async () => {
    const started = Date.now();
    try {
      await runAutoSync(workspaceId, slugs);
      await releaseAutoSync(claim, `Background sync finished for ${slugs.length} project(s) in ${Math.round((Date.now() - started) / 1000)} s`);
    } catch (error) {
      console.error("AUTO_SYNC_FAILED", error);
      await releaseAutoSync(claim, `Background sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  });

  return NextResponse.json({ ok: true, status: "started", projects: slugs.length });
}
