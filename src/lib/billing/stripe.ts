/**
 * Stripe billing without the SDK (plain REST + signed webhooks).
 * Only the secret key is needed: on first use Anitrya creates its three
 * products and monthly prices (lookup keys anitrya_<plan>_monthly) and its
 * webhook endpoint, and remembers their ids and the signing secret.
 * STRIPE_PRICE_* and STRIPE_WEBHOOK_SECRET in Vercel override them.
 * Checkout upgrades the organization; the webhook keeps org_plan in step with
 * the subscription (active → plan, cancelled or unpaid → read-only).
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import type { PlanId } from "@/lib/org/plans";

export { PAID_PLANS, billingConfigured, formEncode, verifyWebhook, priceLabel, type PaidPlan } from "@/lib/billing/stripe-core";
import { PAID_PLANS, DEFAULT_PRICES, WEBHOOK_EVENTS, currency, envPrice, planForPrice, formEncode, stripeKey, type PaidPlan } from "@/lib/billing/stripe-core";
import { PLANS } from "@/lib/org/plans";

const APP_URL = () => process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

async function stripe<T>(path: string, body?: Record<string, unknown>, method = body ? "POST" : "GET"): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${stripeKey()}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? formEncode(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Stripe ${response.status}`);
  return payload;
}

async function getSetting(key: string): Promise<string | null> {
  await ensureAdditiveSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(`SELECT value FROM app_setting WHERE key = $1`, key).catch(() => []);
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_setting (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    value,
  );
}

/** Settings are per Stripe mode, so test and live keys never mix ids. */
const mode = () => (stripeKey()?.startsWith("sk_live") || stripeKey()?.startsWith("rk_live") ? "live" : "test");

let pricesCache: { mode: string; prices: Partial<Record<PaidPlan, string>> } | null = null;

/** Finds or creates the three monthly prices. */
export async function ensurePrices(): Promise<Partial<Record<PaidPlan, string>>> {
  if (pricesCache && pricesCache.mode === mode() && PAID_PLANS.every((p) => pricesCache!.prices[p])) return pricesCache.prices;
  const prices: Partial<Record<PaidPlan, string>> = {};
  for (const plan of PAID_PLANS) {
    const pinned = envPrice(plan) ?? (await getSetting(`stripe_${mode()}_price_${plan}`));
    if (pinned) {
      prices[plan] = pinned;
      continue;
    }
    const lookup = `anitrya_${plan}_monthly`;
    const found = await stripe<{ data: Array<{ id: string }> }>(`/prices?active=true&lookup_keys[]=${lookup}&limit=1`);
    let id = found.data[0]?.id;
    if (!id) {
      const product = await stripe<{ id: string }>("/products", {
        name: `Anitrya ${PLANS[plan].label}`,
        description: `${PLANS[plan].projects} projects, ${PLANS[plan].seats} seats, ${PLANS[plan].aiPerMonth} AI answers a month`,
        metadata: { anitrya: "true", plan },
      });
      const price = await stripe<{ id: string }>("/prices", {
        product: product.id,
        currency: currency(),
        unit_amount: DEFAULT_PRICES[plan],
        recurring: { interval: "month" },
        lookup_key: lookup,
        metadata: { anitrya: "true", plan },
      });
      id = price.id;
    }
    await setSetting(`stripe_${mode()}_price_${plan}`, id);
    prices[plan] = id;
  }
  pricesCache = { mode: mode(), prices };
  return prices;
}

/** The webhook signing secret: from Vercel, or the endpoint Anitrya registered. */
export async function webhookSecret(): Promise<string | null> {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || (await getSetting(`stripe_${mode()}_webhook_secret`));
}

/** Registers Anitrya's webhook endpoint once and stores its signing secret. */
export async function ensureWebhook() {
  if (await webhookSecret()) return;
  const url = `${APP_URL()}/api/stripe/webhook`;
  const existing = await stripe<{ data: Array<{ id: string; url: string; metadata?: Record<string, string> }> }>("/webhook_endpoints?limit=100");
  // An endpoint Anitrya made earlier whose secret was lost can't be read back; replace it.
  for (const endpoint of existing.data.filter((e) => e.url === url && e.metadata?.anitrya === "true")) {
    await stripe(`/webhook_endpoints/${endpoint.id}`, undefined, "DELETE");
  }
  const created = await stripe<{ secret: string }>("/webhook_endpoints", {
    url,
    enabled_events: Object.fromEntries(WEBHOOK_EVENTS.map((e, i) => [i, e])),
    description: "Anitrya subscriptions",
    metadata: { anitrya: "true" },
  });
  await setSetting(`stripe_${mode()}_webhook_secret`, created.secret);
}

let setupDone: string | null = null;
/** Idempotent: prices + webhook. Safe to call on every billing request. */
export async function setupBilling() {
  if (!stripeKey()) return null;
  if (setupDone === mode()) return ensurePrices();
  const prices = await ensurePrices();
  await ensureWebhook();
  setupDone = mode();
  return prices;
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
  const prices = await setupBilling();
  const price = prices?.[input.plan];
  if (!price) throw new Error(`No Stripe price is available for the ${input.plan} plan.`);
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
  const prices = await ensurePrices().catch(() => ({}));
  const plan: PlanId = planForPrice(prices, sub.items?.data?.[0]?.price?.id) ?? (sub.metadata?.plan as PaidPlan) ?? "starter";
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
