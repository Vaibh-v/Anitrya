import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";
import { getStorageStatus, runStorageMaintenance, setStorageMode, type StorageMode } from "@/lib/storage/storage-manager";

export const maxDuration = 300;

async function founderOnly() {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return false;
  return workspaceId === (await resolveFounderWorkspaceId());
}

/** Founder only: storage mode and database usage. */
export async function GET() {
  if (!(await founderOnly())) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, ...(await getStorageStatus()) });
}

/**
 * Founder only.
 * { action: "mode", mode: "lean" | "full" } — one-click switch (Full = never trim; use after upgrading the database plan)
 * { action: "maintain" } — archive old months to Sheets, trim the long tail, reclaim space (runs in the background)
 */
export async function POST(request: Request) {
  if (!(await founderOnly())) return NextResponse.json({ ok: false }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; mode?: string };

  if (body.action === "mode" && (body.mode === "lean" || body.mode === "full")) {
    await setStorageMode(body.mode as StorageMode);
    return NextResponse.json({ ok: true, ...(await getStorageStatus()) });
  }

  if (body.action === "maintain") {
    after(async () => {
      const report = await runStorageMaintenance({ forceReclaim: true }).catch((error) => {
        console.error("STORAGE_MAINTENANCE_FAILED", error);
        return null;
      });
      console.info("STORAGE_MAINTENANCE_DONE", JSON.stringify(report));
    });
    return NextResponse.json({ ok: true, status: "started" });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
