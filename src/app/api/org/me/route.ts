import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess } from "@/lib/org/access";
import { ROLE_LABELS } from "@/lib/org/plans";

/** Small payload for the top bar: role, plan/trial, founder flag, organizations. */
export async function GET() {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false }, { status: 401 });
  const orgs = await prisma.membership.findMany({
    where: { userId: access.userId },
    select: { workspaceId: true, workspace: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const trialDaysLeft = access.trialEndsAt ? Math.max(0, Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / 86400_000)) : null;
  return NextResponse.json({
    ok: true,
    role: access.role,
    roleLabel: ROLE_LABELS[access.role],
    plan: access.plan,
    planLabel: access.limits.label,
    status: access.status,
    trialDaysLeft: access.plan === "trial" ? trialDaysLeft : null,
    isFounder: access.isFounder,
    activeWorkspaceId: access.workspaceId,
    organizations: orgs.map((o) => ({ id: o.workspaceId, name: o.workspace.name })),
  });
}
