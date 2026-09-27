import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { isOrgWritable } from "@/lib/org/access";
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
export async function POST(request: Request) {
  const workspaceId = await workspace();
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  await ensureAdditiveSchema();
  if (!(await isOrgWritable(workspaceId))) return NextResponse.json({ ok: true, status: "readonly" });

  // Onboarding passes the project it just created; that run skips the
  // workspace claim so a login sync already in flight can't delay it.
  const body = (await request.json().catch(() => null)) as { projects?: unknown } | null;
  const targeted = Array.isArray(body?.projects)
    ? (body.projects as unknown[]).filter((slug): slug is string => typeof slug === "string").slice(0, 5)
    : null;
  if (targeted && targeted.length > 0) {
    after(async () => {
      try {
        await runAutoSync(workspaceId, targeted);
      } catch (error) {
        console.error("ONBOARDING_SYNC_FAILED", error);
      }
    });
    return NextResponse.json({ ok: true, status: "started", projects: targeted.length });
  }

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
