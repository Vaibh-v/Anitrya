import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/org/access";
import { createInvite } from "@/lib/org/members";
import { ASSIGNABLE_ROLES, isRole } from "@/lib/org/plans";

const APP_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

/** Invite by email with a role and optional project scope; returns a shareable link. */
export async function POST(request: Request) {
  const access = await requirePermission("manage_members");
  if (access instanceof NextResponse) return access;
  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: string; projectSlugs?: string[] | null };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  if (!isRole(body.role) || !ASSIGNABLE_ROLES.includes(body.role)) return NextResponse.json({ ok: false, error: "Choose a role." }, { status: 400 });
  if (body.role === "CLIENT_VIEWER" && (!Array.isArray(body.projectSlugs) || body.projectSlugs.length === 0)) {
    return NextResponse.json({ ok: false, error: "Pick at least one project for a client viewer." }, { status: 400 });
  }

  const [members, pending] = await Promise.all([
    prisma.membership.count({ where: { workspaceId: access.workspaceId } }),
    prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM org_invite WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()`,
      access.workspaceId,
    ),
  ]);
  if (members + Number(pending[0]?.n ?? 0) >= access.limits.seats) {
    return NextResponse.json({ ok: false, error: `Your ${access.limits.label} plan includes ${access.limits.seats} seats.` }, { status: 403 });
  }

  const invite = await createInvite({
    workspaceId: access.workspaceId,
    email,
    role: body.role,
    projectSlugs: Array.isArray(body.projectSlugs) && body.projectSlugs.length ? body.projectSlugs : null,
    invitedBy: access.userId,
  });
  await audit(access, "invite.created", { email, role: body.role, projectSlugs: body.projectSlugs ?? null });
  return NextResponse.json({ ok: true, link: `${APP_URL}/invite/${invite.token}`, expiresAt: invite.expiresAt });
}

export async function DELETE(request: Request) {
  const access = await requirePermission("manage_members");
  if (access instanceof NextResponse) return access;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await prisma.$executeRawUnsafe(`UPDATE org_invite SET revoked_at = NOW() WHERE id = CAST($1 AS UUID) AND workspace_id = $2`, id, access.workspaceId);
  await audit(access, "invite.revoked", { id });
  return NextResponse.json({ ok: true });
}
