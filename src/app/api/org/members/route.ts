import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, getAccess, requirePermission } from "@/lib/org/access";
import { setMembership, setMemberScope } from "@/lib/org/members";
import { ASSIGNABLE_ROLES, ROLE_LABELS, isRole } from "@/lib/org/plans";

type MemberRow = { user_id: string; email: string; name: string | null; role: string; created_at: Date; project_slugs: string[] | null };

/** Team overview: members, open invites, plan and recent access changes. */
export async function GET() {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false }, { status: 401 });
  const canManage = access.permissions.includes("manage_members");

  const [members, invites, auditRows, counts] = await Promise.all([
    prisma.$queryRawUnsafe<MemberRow[]>(
      `SELECT m."userId" AS user_id, u.email, u.name, CAST(m.role AS TEXT) AS role, m."createdAt" AS created_at, s.project_slugs
       FROM "Membership" m JOIN "User" u ON u.id = m."userId"
       LEFT JOIN member_scope s ON s.workspace_id = m."workspaceId" AND s.user_id = m."userId"
       WHERE m."workspaceId" = $1 ORDER BY m."createdAt" ASC`,
      access.workspaceId,
    ),
    canManage
      ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT id, email, role, project_slugs, token, expires_at FROM org_invite
           WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC`,
          access.workspaceId,
        )
      : Promise.resolve([]),
    canManage
      ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT actor_email, action, detail, created_at FROM audit_log WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 20`,
          access.workspaceId,
        )
      : Promise.resolve([]),
    prisma.project.count({ where: { workspaceId: access.workspaceId } }),
  ]);

  return NextResponse.json({
    ok: true,
    me: { userId: access.userId, role: access.role, permissions: access.permissions },
    plan: { id: access.plan, label: access.limits.label, status: access.status, trialEndsAt: access.trialEndsAt, isTest: access.isTest, limits: access.limits, projects: counts },
    policy: access.policy,
    members: members.map((m, index) => ({
      userId: m.user_id,
      email: m.email,
      name: m.name,
      role: index === 0 && (m.role === "ADMIN" || m.role === "EDITOR") ? "OWNER" : m.role,
      roleLabel: ROLE_LABELS[(index === 0 && (m.role === "ADMIN" || m.role === "EDITOR") ? "OWNER" : m.role) as keyof typeof ROLE_LABELS] ?? m.role,
      projectSlugs: m.project_slugs,
      joinedAt: m.created_at,
    })),
    invites,
    audit: auditRows,
    assignableRoles: ASSIGNABLE_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] })),
  });
}

/** Change a member's role and/or project scope. */
export async function PATCH(request: Request) {
  const access = await requirePermission("manage_members");
  if (access instanceof NextResponse) return access;
  const body = (await request.json().catch(() => ({}))) as { userId?: string; role?: string; projectSlugs?: string[] | null };
  if (!body.userId) return NextResponse.json({ ok: false, error: "userId is required." }, { status: 400 });

  const first = await prisma.membership.findFirst({ where: { workspaceId: access.workspaceId }, orderBy: { createdAt: "asc" }, select: { userId: true } });
  const target = await prisma.membership.findFirst({ where: { workspaceId: access.workspaceId, userId: body.userId }, select: { role: true } });
  if (!target) return NextResponse.json({ ok: false, error: "Not a member of this organization." }, { status: 404 });
  if (body.userId === first?.userId || String(target.role) === "OWNER") {
    return NextResponse.json({ ok: false, error: "The owner's role can't be changed here." }, { status: 403 });
  }

  if (body.role !== undefined) {
    if (!isRole(body.role) || !ASSIGNABLE_ROLES.includes(body.role)) {
      return NextResponse.json({ ok: false, error: "Unknown role." }, { status: 400 });
    }
    await setMembership({ workspaceId: access.workspaceId, userId: body.userId, role: body.role });
  }
  if (body.projectSlugs !== undefined) {
    const slugs = Array.isArray(body.projectSlugs) ? body.projectSlugs.filter((s) => typeof s === "string").slice(0, 200) : null;
    await setMemberScope({ workspaceId: access.workspaceId, userId: body.userId, projectSlugs: slugs });
  }
  await audit(access, "member.updated", { userId: body.userId, role: body.role, projectSlugs: body.projectSlugs });
  return NextResponse.json({ ok: true });
}

/** Remove a member (never the owner). */
export async function DELETE(request: Request) {
  const access = await requirePermission("manage_members");
  if (access instanceof NextResponse) return access;
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  const first = await prisma.membership.findFirst({ where: { workspaceId: access.workspaceId }, orderBy: { createdAt: "asc" }, select: { userId: true } });
  if (!userId || userId === first?.userId) return NextResponse.json({ ok: false, error: "The owner can't be removed." }, { status: 403 });
  await prisma.membership.deleteMany({ where: { workspaceId: access.workspaceId, userId } });
  await prisma.$executeRawUnsafe(`DELETE FROM member_scope WHERE workspace_id = $1 AND user_id = $2`, access.workspaceId, userId);
  await audit(access, "member.removed", { userId });
  return NextResponse.json({ ok: true });
}
