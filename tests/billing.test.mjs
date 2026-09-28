import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const b = await import("../src/lib/billing/stripe-core.ts");

test("Stripe form encoding handles nested keys", () => {
  assert.equal(
    b.formEncode({ mode: "subscription", line_items: { 0: { price: "price_1", quantity: 1 } }, metadata: { plan: "growth" } }),
    "mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Bplan%5D=growth",
  );
});

test("webhook signatures are verified, including age", () => {
  const secret = "whsec_test";
  const payload = '{"type":"customer.subscription.updated"}';
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  assert.ok(b.verifyWebhook(payload, `t=${t},v1=${sig}`, secret));
  assert.ok(!b.verifyWebhook(payload + " ", `t=${t},v1=${sig}`, secret), "tampered body");
  assert.ok(!b.verifyWebhook(payload, `t=${t - 600},v1=${crypto.createHmac("sha256", secret).update(`${t - 600}.${payload}`).digest("hex")}`, secret), "too old");
});

test("prices map back to plans and keys are found under any saved name", () => {
  assert.equal(b.planForPrice({ growth: "price_growth" }, "price_growth"), "growth");
  assert.equal(b.planForPrice({ growth: "price_growth" }, "price_other"), null);
  process.env.STRIPE_Key = "sk_test_x";
  assert.equal(b.stripeKey(), "sk_test_x");
  delete process.env.STRIPE_Key;
  assert.equal(b.priceLabel("starter"), "$49/mo");
});
