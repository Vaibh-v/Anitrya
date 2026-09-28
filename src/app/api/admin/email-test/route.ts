import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";
import { sendWeeklyDigests } from "@/lib/email/weekly-digest";

export const maxDuration = 120;

/** Founder only: sends this week's digest for the founder's workspace to the founder alone. */
export async function POST() {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  const email = session?.user?.email;
  if (!workspaceId || !email || workspaceId !== (await resolveFounderWorkspaceId())) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const result = await sendWeeklyDigests({ onlyWorkspaceId: workspaceId, onlyEmail: email });
  return NextResponse.json({ ok: result.sent > 0, to: email, ...result });
}
