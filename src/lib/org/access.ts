/**
 * Resolves who is acting, in which organization, with which role, plan and
 * project scope — and answers "may they do X?". Cached per request.
 */
import { cache } from "react";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";
import {
  PLANS,
  effectiveStatus,
  isRole,
  permissionsFor,
  roleCan,
  type OrgStatus,
  type Permission,
  type PlanId,
  type RoleId,
  type RolePolicy,
} from "@/lib/org/plans";

export type Access = {
  userId: string;
  email: string;
  workspaceId: string;
  role: RoleId;
  plan: PlanId;
  status: OrgStatus;
  isTest: boolean;
  trialEndsAt: string | null;
  limits: (typeof PLANS)[PlanId];
  policy: RolePolicy;
  /** null = every project in the organization. */
  projectScope: string[] | null;
  isFounder: boolean;
  permissions: Permission[];
};

type PlanRow = { plan: string; status: string; is_test: boolean; trial_ends_at: Date | null; expires_at: Date | null; policy: RolePolicy | null };

/** Creates the plan row on first use: founder workspace → Founder, everyone else → 14-day trial. */
export async function ensureOrgPlan(workspaceId: string): Promise<PlanRow> {
  await ensureAdditiveSchema();
  const existing = await prisma.$queryRawUnsafe<PlanRow[]>(
    `SELECT plan, status, is_test, trial_ends_at, expires_at, policy FROM org_plan WHERE workspace_id = $1`,
    workspaceId,
  );
  if (existing[0]) return existing[0];
  const founder = workspaceId === (await resolveFounderWorkspaceId());
  const trialEnds = new Date(Date.now() + (PLANS.trial.trialDays ?? 14) * 86400_000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO org_plan (workspace_id, plan, status, trial_ends_at) VALUES ($1, $2, $3, $4) ON CONFLICT (workspace_id) DO NOTHING`,
    workspaceId,
    founder ? "founder" : "trial",
    founder ? "active" : "trial",
    founder ? null : trialEnds,
  );
  return { plan: founder ? "founder" : "trial", status: founder ? "active" : "trial", is_test: false, trial_ends_at: founder ? null : trialEnds, expires_at: null, policy: {} };
}

export const getAccess = cache(async (): Promise<Access | null> => {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!workspaceId || !userId || !email) return null;

  const [membership, planRow, founderWorkspaceId] = await Promise.all([
    prisma.membership.findFirst({ where: { workspaceId, userId }, select: { role: true, createdAt: true } }),
    ensureOrgPlan(workspaceId),
    resolveFounderWorkspaceId(),
  ]);
  if (!membership) return null;

  // Legacy workspaces gave their creator ADMIN; the first member is the owner.
  let role = (isRole(membership.role) ? membership.role : "VIEWER") as RoleId;
  if (role === "ADMIN" || role === "EDITOR") {
    const first = await prisma.membership.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { userId: true } });
    if (first?.userId === userId) role = "OWNER";
  }

  const scopeRows = await prisma.$queryRawUnsafe<Array<{ project_slugs: string[] | null }>>(
    `SELECT project_slugs FROM member_scope WHERE workspace_id = $1 AND user_id = $2`,
    workspaceId,
    userId,
  );
  const scope = Array.isArray(scopeRows[0]?.project_slugs) ? scopeRows[0]!.project_slugs! : null;

  const plan = (planRow.plan in PLANS ? planRow.plan : "trial") as PlanId;
  const status = effectiveStatus({
    plan,
    status: (planRow.status as OrgStatus) ?? "trial",
    trialEndsAt: planRow.trial_ends_at,
    expiresAt: planRow.expires_at,
  });
  const policy = (planRow.policy ?? {}) as RolePolicy;
  const isFounder = workspaceId === founderWorkspaceId && role === "OWNER";

  return {
    userId,
    email,
    workspaceId,
    role,
    plan,
    status,
    isTest: planRow.is_test,
    trialEndsAt: planRow.trial_ends_at ? planRow.trial_ends_at.toISOString() : null,
    limits: PLANS[plan],
    policy,
    // Client viewers always have an explicit list; an empty scope means no projects.
    projectScope: role === "CLIENT_VIEWER" ? scope ?? [] : scope,
    isFounder,
    permissions: permissionsFor({ role, status, policy }),
  };
});

export function can(access: Access | null, permission: Permission) {
  return Boolean(access && roleCan({ role: access.role, status: access.status, policy: access.policy }, permission));
}

export function canSeeProject(access: Access | null, projectSlug: string | null | undefined) {
  if (!access) return false;
  if (!access.projectScope) return true;
  return Boolean(projectSlug && access.projectScope.includes(projectSlug));
}

/** For API routes: returns a 401/403 response when not allowed, otherwise the access. */
export async function requirePermission(permission: Permission, projectSlug?: string | null): Promise<Access | NextResponse> {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  if (!can(access, permission)) {
    const reason =
      access.status === "readonly"
        ? "This organization's trial has ended — it's read-only until a plan is chosen."
        : `Your role (${access.role.toLowerCase().replace("_", " ")}) can't do this.`;
    return NextResponse.json({ ok: false, error: reason }, { status: 403 });
  }
  if (projectSlug !== undefined && projectSlug !== null && !canSeeProject(access, projectSlug)) {
    return NextResponse.json({ ok: false, error: "You don't have access to this project." }, { status: 403 });
  }
  return access;
}

export async function audit(access: Pick<Access, "workspaceId" | "userId" | "email">, action: string, detail?: Record<string, unknown>) {
  await prisma
    .$executeRawUnsafe(
      `INSERT INTO audit_log (workspace_id, actor_user_id, actor_email, action, detail) VALUES ($1, $2, $3, $4, CAST($5 AS JSONB))`,
      access.workspaceId,
      access.userId,
      access.email,
      action,
      JSON.stringify(detail ?? {}),
    )
    .catch((error) => console.warn("AUDIT_WRITE_FAILED", error instanceof Error ? error.message : error));
}

/** Keeps page navigation inside a member's allowed projects. */
export async function scopedProjectRef(ref: string | null | undefined): Promise<string | null> {
  const access = await getAccess();
  if (!access?.projectScope) return ref ?? null;
  if (ref && access.projectScope.includes(ref)) return ref;
  return access.projectScope[0] ?? "__no_project_access__";
}

/** False when a trial has ended (read-only) — background syncs skip these. */
export async function isOrgWritable(workspaceId: string): Promise<boolean> {
  const row = await ensureOrgPlan(workspaceId).catch(() => null);
  if (!row) return true;
  const plan = (row.plan in PLANS ? row.plan : "trial") as PlanId;
  return effectiveStatus({ plan, status: row.status as OrgStatus, trialEndsAt: row.trial_ends_at, expiresAt: row.expires_at }) !== "readonly";
}
