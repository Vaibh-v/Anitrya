import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";
import { healthReport } from "@/lib/ops/health";

/** Founder only: the same health report the nightly check emails. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId || workspaceId !== (await resolveFounderWorkspaceId())) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, ...(await healthReport()) });
}
