import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/org/access";
import { billingConfigured, createPortal } from "@/lib/billing/stripe";

/** Owner only: opens Stripe's billing portal (change plan, card, invoices, cancel). */
export async function POST() {
  const access = await requirePermission("billing");
  if (access instanceof NextResponse) return access;
  if (!billingConfigured()) return NextResponse.json({ ok: false, error: "Billing isn't switched on yet." }, { status: 409 });
  try {
    return NextResponse.json({ ok: true, url: await createPortal(access.workspaceId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not open billing." }, { status: 400 });
  }
}
