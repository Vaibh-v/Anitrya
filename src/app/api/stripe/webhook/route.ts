import { NextResponse } from "next/server";
import { handleStripeEvent, verifyWebhook } from "@/lib/billing/stripe";

/** Stripe → Anitrya. Point a Stripe webhook here with the subscription and checkout events. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const payload = await request.text();
  if (!secret || !verifyWebhook(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await handleStripeEvent(JSON.parse(payload));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_FAILED", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
