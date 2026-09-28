import { NextResponse } from "next/server";
import { requirePermission, audit } from "@/lib/org/access";
import { billingConfigured, createCheckout, PAID_PLANS, type PaidPlan } from "@/lib/billing/stripe";

/** Owner only: starts Stripe Checkout for a paid plan and returns its URL. */
export async function POST(request: Request) {
  const access = await requirePermission("billing");
  if (access instanceof NextResponse) return access;
  if (!billingConfigured()) return NextResponse.json({ ok: false, error: "Billing isn't switched on yet." }, { status: 409 });
  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  if (!PAID_PLANS.includes(body.plan as PaidPlan)) return NextResponse.json({ ok: false, error: "Choose a plan." }, { status: 400 });
  try {
    const url = await createCheckout({ workspaceId: access.workspaceId, email: access.email, plan: body.plan as PaidPlan });
    await audit(access, "billing.checkout", { plan: body.plan });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Checkout failed." }, { status: 502 });
  }
}
