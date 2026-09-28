import { NextResponse } from "next/server";
import { getAccess } from "@/lib/org/access";
import { PLANS } from "@/lib/org/plans";
import { billingConfigured, PAID_PLANS, priceLabel, setupBilling } from "@/lib/billing/stripe";

/** Current plan, trial days and which paid plans can be bought (sets up Stripe on first call). */
export async function GET() {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false }, { status: 401 });
  let prices: Partial<Record<string, string>> | null = null;
  let setupError: string | null = null;
  if (billingConfigured()) {
    prices = await setupBilling().catch((error) => {
      setupError = error instanceof Error ? error.message : "Stripe setup failed";
      return null;
    });
  }
  return NextResponse.json({
    ok: true,
    plan: access.plan,
    label: access.limits.label,
    status: access.status,
    trialEndsAt: access.trialEndsAt,
    canManage: access.permissions.includes("billing"),
    enabled: Boolean(prices),
    setupError: access.isFounder ? setupError : null,
    plans: PAID_PLANS.map((id) => ({ id, ...PLANS[id], price: priceLabel(id), available: Boolean(prices?.[id]) })),
  });
}
