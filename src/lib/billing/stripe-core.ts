/** Pure Stripe helpers (no database), shared by the billing routes and tests. */
import crypto from "node:crypto";

export const PAID_PLANS = ["starter", "growth", "agency"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

/** Monthly list price per plan, in the smallest currency unit (cents). */
export const DEFAULT_PRICES: Record<PaidPlan, number> = { starter: 4900, growth: 14900, agency: 39900 };

export function currency() {
  return (process.env.ANITRYA_CURRENCY?.trim() || "usd").toLowerCase();
}

/** "$49/mo" style label, from ANITRYA_PRICE_<PLAN> or the default amount. */
export function priceLabel(plan: PaidPlan): string {
  const custom = process.env[`ANITRYA_PRICE_${plan.toUpperCase()}`]?.trim();
  if (custom) return custom;
  const amount = DEFAULT_PRICES[plan] / 100;
  const symbol = { usd: "$", eur: "€", gbp: "£", inr: "₹", aud: "A$", cad: "C$" }[currency()] ?? `${currency().toUpperCase()} `;
  return `${symbol}${amount.toLocaleString("en-US")}/mo`;
}

/** The Stripe secret key, under any of the names it may be saved as. */
export function stripeKey(): string | null {
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_Key", "STRIPE_KEY", "STRIPE_API_KEY", "STRIPE_SECRET"]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** A price id pinned in Vercel (STRIPE_PRICE_STARTER…); otherwise Anitrya creates and remembers one. */
export function envPrice(plan: PaidPlan): string | null {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() || null;
}

export function billingConfigured() {
  return Boolean(stripeKey());
}

export function planForPrice(prices: Partial<Record<PaidPlan, string>>, priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  return PAID_PLANS.find((p) => prices[p] === priceId) ?? null;
}

export const WEBHOOK_EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];

/** Stripe form encoding, including nested keys like line_items[0][price]. */
export function formEncode(data: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") parts.push(formEncode(value as Record<string, unknown>, name));
    else parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
  }
  return parts.filter(Boolean).join("&");
}

/** Verifies a Stripe-Signature header (v1 HMAC-SHA256, 5-minute tolerance). */
export function verifyWebhook(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  const signatures = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  if (!t || signatures.length === 0 || Math.abs(now / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return signatures.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

