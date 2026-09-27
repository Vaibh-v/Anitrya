import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setActiveWorkspace } from "@/lib/org/members";

/** Organizations the signed-in user belongs to. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { workspaceId: true, workspace: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    ok: true,
    active: session?.user?.workspaceId ?? null,
    organizations: memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name })),
  });
}

/** Switch the active organization (takes effect within seconds, no sign-out). */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { workspaceId?: string };
  const member = body.workspaceId ? await prisma.membership.findFirst({ where: { userId, workspaceId: body.workspaceId } }) : null;
  if (!member) return NextResponse.json({ ok: false, error: "Not a member of that organization." }, { status: 403 });
  await setActiveWorkspace(userId, body.workspaceId!);
  return NextResponse.json({ ok: true });
}
