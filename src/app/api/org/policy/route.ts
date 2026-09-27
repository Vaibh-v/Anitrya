import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/org/access";
import { ASSIGNABLE_ROLES, type Permission, type RolePolicy } from "@/lib/org/plans";

const TOGGLEABLE: Permission[] = ["sync", "export", "ai", "manage_sources", "manage_projects"];

/** Owner only: switch features off per role, e.g. { ANALYST: { export: false } }. */
export async function PATCH(request: Request) {
  const access = await requirePermission("billing");
  if (access instanceof NextResponse) return access;
  const body = (await request.json().catch(() => ({}))) as { policy?: RolePolicy };
  const policy: RolePolicy = {};
  for (const role of ASSIGNABLE_ROLES) {
    const entry = body.policy?.[role];
    if (!entry) continue;
    policy[role] = {};
    for (const permission of TOGGLEABLE) {
      if (entry[permission] === false) policy[role]![permission] = false;
    }
  }
  await prisma.$executeRawUnsafe(`UPDATE org_plan SET policy = CAST($2 AS JSONB), updated_at = NOW() WHERE workspace_id = $1`, access.workspaceId, JSON.stringify(policy));
  await audit(access, "policy.updated", { policy });
  return NextResponse.json({ ok: true, policy });
}
