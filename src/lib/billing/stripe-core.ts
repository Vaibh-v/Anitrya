/** Pure Stripe helpers (no database), shared by the billing routes and tests. */
import crypto from "node:crypto";

export const PAID_PLANS = ["starter", "growth", "agency"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export function priceFor(plan: PaidPlan): string | null {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() || null;
}

export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim()) && PAID_PLANS.some((p) => priceFor(p));
}

export function planForPrice(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  return PAID_PLANS.find((p) => priceFor(p) === priceId) ?? null;
}

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

