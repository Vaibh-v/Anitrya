/**
 * Membership and invitation writes. Roles are written with raw SQL so the new
 * Role values (OWNER, CLIENT_VIEWER) work even before a client regenerate.
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import type { RoleId } from "@/lib/org/plans";

export const INVITE_DAYS = 7;

export async function setMembership(input: { workspaceId: string; userId: string; role: RoleId }) {
  await ensureAdditiveSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Membership" ("id", "role", "userId", "workspaceId", "createdAt", "updatedAt")
     VALUES ($1, CAST($2 AS "Role"), $3, $4, NOW(), NOW())
     ON CONFLICT ("userId", "workspaceId") DO UPDATE SET "role" = EXCLUDED."role", "updatedAt" = NOW()`,
    `m_${crypto.randomUUID().replace(/-/g, "")}`,
    input.role,
    input.userId,
    input.workspaceId,
  );
}

export async function setMemberScope(input: { workspaceId: string; userId: string; projectSlugs: string[] | null }) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO member_scope (workspace_id, user_id, project_slugs, updated_at) VALUES ($1, $2, CAST($3 AS JSONB), NOW())
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET project_slugs = EXCLUDED.project_slugs, updated_at = NOW()`,
    input.workspaceId,
    input.userId,
    input.projectSlugs ? JSON.stringify(input.projectSlugs) : null,
  );
}

export async function setActiveWorkspace(userId: string, workspaceId: string) {
  await ensureAdditiveSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_pref (user_id, active_workspace_id, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET active_workspace_id = EXCLUDED.active_workspace_id, updated_at = NOW()`,
    userId,
    workspaceId,
  );
}

export async function getActiveWorkspace(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ active_workspace_id: string | null }>>(
      `SELECT active_workspace_id FROM user_pref WHERE user_id = $1`,
      userId,
    );
    return rows[0]?.active_workspace_id ?? null;
  } catch {
    return null;
  }
}

export async function createInvite(input: {
  workspaceId: string;
  email: string;
  role: RoleId;
  projectSlugs: string[] | null;
  invitedBy: string;
  days?: number;
}) {
  await ensureAdditiveSchema();
  const token = crypto.randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + (input.days ?? INVITE_DAYS) * 86400_000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO org_invite (workspace_id, email, role, project_slugs, token, invited_by, expires_at)
     VALUES ($1, lower($2), $3, CAST($4 AS JSONB), $5, $6, $7)`,
    input.workspaceId,
    input.email.trim(),
    input.role,
    input.projectSlugs ? JSON.stringify(input.projectSlugs) : null,
    token,
    input.invitedBy,
    expires,
  );
  return { token, expiresAt: expires.toISOString() };
}

type InviteRow = { id: string; workspace_id: string; email: string; role: RoleId; project_slugs: string[] | null; expires_at: Date };

export async function findInviteByToken(token: string): Promise<InviteRow | null> {
  await ensureAdditiveSchema();
  const rows = await prisma.$queryRawUnsafe<InviteRow[]>(
    `SELECT id, workspace_id, email, role, project_slugs, expires_at FROM org_invite
     WHERE token = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()`,
    token,
  );
  return rows[0] ?? null;
}

/**
 * Accepts every open invite for this email (called at sign-in and from the
 * invite page). Returns the workspace of the newest accepted invite.
 */
export async function acceptInvitesForUser(input: { userId: string; email: string }): Promise<string | null> {
  try {
    await ensureAdditiveSchema();
    const invites = await prisma.$queryRawUnsafe<InviteRow[]>(
      `SELECT id, workspace_id, email, role, project_slugs, expires_at FROM org_invite
       WHERE lower(email) = lower($1) AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at ASC`,
      input.email,
    );
    let last: string | null = null;
    for (const invite of invites) {
      await setMembership({ workspaceId: invite.workspace_id, userId: input.userId, role: invite.role });
      await setMemberScope({ workspaceId: invite.workspace_id, userId: input.userId, projectSlugs: invite.project_slugs });
      await prisma.$executeRawUnsafe(`UPDATE org_invite SET accepted_at = NOW() WHERE id = CAST($1 AS UUID)`, invite.id);
      await prisma.$executeRawUnsafe(
        `INSERT INTO audit_log (workspace_id, actor_user_id, actor_email, action, detail) VALUES ($1, $2, $3, 'invite.accepted', CAST($4 AS JSONB))`,
        invite.workspace_id,
        input.userId,
        input.email,
        JSON.stringify({ role: invite.role }),
      );
      last = invite.workspace_id;
    }
    if (last) await setActiveWorkspace(input.userId, last);
    return last;
  } catch (error) {
    console.error("INVITE_ACCEPT_FAILED", error instanceof Error ? error.message : error);
    return null;
  }
}
