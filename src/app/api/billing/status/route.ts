import { NextResponse } from "next/server";
import { getAccess } from "@/lib/org/access";
import { PLANS } from "@/lib/org/plans";
import { billingConfigured, PAID_PLANS, priceFor } from "@/lib/billing/stripe";

/** Current plan, trial days and which paid plans can be bought. */
export async function GET() {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    plan: access.plan,
    label: access.limits.label,
    status: access.status,
    trialEndsAt: access.trialEndsAt,
    canManage: access.permissions.includes("billing"),
    enabled: billingConfigured(),
    plans: PAID_PLANS.map((id) => ({ id, ...PLANS[id], available: Boolean(priceFor(id)) })),
  });
}
