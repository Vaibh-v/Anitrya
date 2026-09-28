/**
 * Stripe billing without the SDK (plain REST + signed webhooks).
 * Enabled by STRIPE_SECRET_KEY and one price per paid plan:
 * STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_AGENCY.
 * Checkout upgrades the organization; the webhook keeps org_plan in step with
 * the subscription (active → plan, cancelled or unpaid → read-only).
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import type { PlanId } from "@/lib/org/plans";

export { PAID_PLANS, priceFor, billingConfigured, planForPrice, formEncode, verifyWebhook, type PaidPlan } from "@/lib/billing/stripe-core";
import { priceFor, planForPrice, formEncode, type PaidPlan } from "@/lib/billing/stripe-core";

const APP_URL = () => process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

async function stripe<T>(path: string, body?: Record<string, unknown>, method = body ? "POST" : "GET"): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? formEncode(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Stripe ${response.status}`);
  return payload;
}

async function billingRow(workspaceId: string) {
  await ensureAdditiveSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>>(
    `SELECT stripe_customer_id, stripe_subscription_id FROM org_plan WHERE workspace_id = $1`,
    workspaceId,
  );
  return rows[0] ?? { stripe_customer_id: null, stripe_subscription_id: null };
}

export async function createCheckout(input: { workspaceId: string; email: string; plan: PaidPlan }) {
  const price = priceFor(input.plan);
  if (!price) throw new Error(`No Stripe price is set for the ${input.plan} plan.`);
  const row = await billingRow(input.workspaceId);
  const session = await stripe<{ url: string }>("/checkout/sessions", {
    mode: "subscription",
    client_reference_id: input.workspaceId,
    ...(row.stripe_customer_id ? { customer: row.stripe_customer_id } : { customer_email: input.email }),
    line_items: { 0: { price, quantity: 1 } },
    allow_promotion_codes: "true",
    metadata: { workspace_id: input.workspaceId, plan: input.plan },
    subscription_data: { metadata: { workspace_id: input.workspaceId, plan: input.plan } },
    success_url: `${APP_URL()}/home/settings?billing=success#billing`,
    cancel_url: `${APP_URL()}/home/settings?billing=cancelled#billing`,
  });
  return session.url;
}

export async function createPortal(workspaceId: string) {
  const row = await billingRow(workspaceId);
  if (!row.stripe_customer_id) throw new Error("There is no subscription to manage yet.");
  const session = await stripe<{ url: string }>("/billing_portal/sessions", {
    customer: row.stripe_customer_id,
    return_url: `${APP_URL()}/home/settings#billing`,
  });
  return session.url;
}

type Subscription = { id: string; customer: string; status: string; metadata?: Record<string, string>; items?: { data?: Array<{ price?: { id?: string } }> }; current_period_end?: number };

/** Maps a subscription onto the organization's plan. */
export async function applySubscription(sub: Subscription, workspaceIdHint?: string | null) {
  const workspaceId = sub.metadata?.workspace_id || workspaceIdHint;
  if (!workspaceId) return;
  const plan: PlanId = planForPrice(sub.items?.data?.[0]?.price?.id) ?? (sub.metadata?.plan as PaidPlan) ?? "starter";
  const live = ["active", "trialing", "past_due"].includes(sub.status);
  await ensureAdditiveSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO org_plan (workspace_id, plan, status, stripe_customer_id, stripe_subscription_id, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT (workspace_id) DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status,
       stripe_customer_id = EXCLUDED.stripe_customer_id, stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       expires_at = NULL, updated_at = CURRENT_TIMESTAMP`,
    workspaceId,
    live ? plan : "trial",
    live ? "active" : "readonly",
    sub.customer,
    sub.id,
  );
}

export async function handleStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const object = event.data.object;
  if (event.type === "checkout.session.completed" && typeof object.subscription === "string") {
    const sub = await stripe<Subscription>(`/subscriptions/${object.subscription}`);
    await applySubscription(sub, (object.client_reference_id as string) ?? null);
    return;
  }
  if (event.type.startsWith("customer.subscription.")) {
    await applySubscription(object as unknown as Subscription);
  }
}
