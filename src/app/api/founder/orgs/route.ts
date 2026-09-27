import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { audit, ensureOrgPlan, getAccess } from "@/lib/org/access";
import { createInvite } from "@/lib/org/members";
import { PLANS, type PlanId } from "@/lib/org/plans";

const APP_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

async function founder() {
  const access = await getAccess();
  return access?.isFounder ? access : null;
}

/** Founder console: every organization with plan, status, members and projects. */
export async function GET() {
  const access = await founder();
  if (!access) return NextResponse.json({ ok: false }, { status: 403 });
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { memberships: true, projects: true } },
      memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { user: { select: { email: true } } } },
    },
  });
  for (const w of workspaces) await ensureOrgPlan(w.id);
  const plans = await prisma.$queryRawUnsafe<Array<{ workspace_id: string; plan: string; status: string; is_test: boolean; trial_ends_at: Date | null; expires_at: Date | null; note: string | null }>>(
    `SELECT workspace_id, plan, status, is_test, trial_ends_at, expires_at, note FROM org_plan`,
  );
  const byId = new Map(plans.map((p) => [p.workspace_id, p]));
  return NextResponse.json({
    ok: true,
    plans: Object.entries(PLANS).map(([id, p]) => ({ id, label: p.label })),
    organizations: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      owner: w.memberships[0]?.user.email ?? null,
      members: w._count.memberships,
      projects: w._count.projects,
      createdAt: w.createdAt,
      ...(byId.get(w.id) ?? {}),
    })),
  });
}

/** Create a test organization and an Owner invite link for the given email. */
export async function POST(request: Request) {
  const access = await founder();
  if (!access) return NextResponse.json({ ok: false }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; ownerEmail?: string; days?: number; plan?: string };
  const email = body.ownerEmail?.trim().toLowerCase() ?? "";
  if (!body.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Name and a valid owner email are required." }, { status: 400 });
  }
  const days = Math.min(90, Math.max(1, Number(body.days) || 14));
  const plan = (body.plan && body.plan in PLANS ? body.plan : "test") as PlanId;
  const workspace = await prisma.workspace.create({
    data: { name: body.name.trim(), slug: `test-${crypto.randomBytes(4).toString("hex")}` },
    select: { id: true },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO org_plan (workspace_id, plan, status, is_test, expires_at, note) VALUES ($1, $2, 'test', true, $3, $4)
     ON CONFLICT (workspace_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'test', is_test = true, expires_at = EXCLUDED.expires_at`,
    workspace.id,
    plan,
    new Date(Date.now() + days * 86400_000),
    `Test organization created by ${access.email}`,
  );
  const invite = await createInvite({ workspaceId: workspace.id, email, role: "OWNER", projectSlugs: null, invitedBy: access.userId, days: Math.min(days, 30) });
  await audit({ ...access, workspaceId: workspace.id }, "founder.test_org_created", { name: body.name, email, days, plan });
  return NextResponse.json({ ok: true, workspaceId: workspace.id, link: `${APP_URL}/invite/${invite.token}` });
}

/** Change an organization's plan/status, extend a trial, or flag it as test. */
export async function PATCH(request: Request) {
  const access = await founder();
  if (!access) return NextResponse.json({ ok: false }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { workspaceId?: string; plan?: string; status?: string; extendDays?: number; isTest?: boolean };
  if (!body.workspaceId) return NextResponse.json({ ok: false, error: "workspaceId is required." }, { status: 400 });
  await ensureOrgPlan(body.workspaceId);
  if (body.plan && body.plan in PLANS) {
    await prisma.$executeRawUnsafe(`UPDATE org_plan SET plan = $2, status = CASE WHEN $2 = 'trial' THEN 'trial' ELSE 'active' END, updated_at = NOW() WHERE workspace_id = $1`, body.workspaceId, body.plan);
  }
  if (body.status && ["trial", "active", "readonly", "test"].includes(body.status)) {
    await prisma.$executeRawUnsafe(`UPDATE org_plan SET status = $2, updated_at = NOW() WHERE workspace_id = $1`, body.workspaceId, body.status);
  }
  if (body.extendDays) {
    const days = Math.min(90, Math.max(1, Number(body.extendDays)));
    await prisma.$executeRawUnsafe(
      `UPDATE org_plan SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + ($2 || ' days')::interval,
              expires_at = CASE WHEN expires_at IS NULL THEN NULL ELSE GREATEST(expires_at, NOW()) + ($2 || ' days')::interval END,
              updated_at = NOW() WHERE workspace_id = $1`,
      body.workspaceId,
      String(days),
    );
  }
  if (typeof body.isTest === "boolean") {
    await prisma.$executeRawUnsafe(`UPDATE org_plan SET is_test = $2, updated_at = NOW() WHERE workspace_id = $1`, body.workspaceId, body.isTest);
  }
  await audit({ ...access, workspaceId: body.workspaceId }, "founder.org_updated", body as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}
