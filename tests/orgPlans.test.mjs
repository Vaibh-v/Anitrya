import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const p = await import("../src/lib/org/plans.ts");

test("role matrix", () => {
  assert.ok(p.roleCan({ role: "OWNER", status: "active" }, "billing"));
  assert.ok(!p.roleCan({ role: "ADMIN", status: "active" }, "billing"));
  assert.ok(p.roleCan({ role: "ANALYST", status: "active" }, "export"));
  assert.ok(!p.roleCan({ role: "ANALYST", status: "active" }, "manage_members"));
  assert.ok(p.roleCan({ role: "VIEWER", status: "active" }, "view"));
  assert.ok(!p.roleCan({ role: "CLIENT_VIEWER", status: "active" }, "sync"));
});

test("owner policy switches features off per role, never for the owner", () => {
  const policy = { ANALYST: { export: false } };
  assert.ok(!p.roleCan({ role: "ANALYST", status: "active", policy }, "export"));
  assert.ok(p.roleCan({ role: "ANALYST", status: "active", policy }, "ai"));
  assert.ok(p.roleCan({ role: "OWNER", status: "active", policy: { OWNER: { export: false } } }, "export"));
});

test("an ended trial becomes read-only, keeping view", () => {
  const status = p.effectiveStatus({ plan: "trial", status: "trial", trialEndsAt: new Date(Date.now() - 1000), expiresAt: null });
  assert.equal(status, "readonly");
  assert.ok(p.roleCan({ role: "OWNER", status }, "view"));
  assert.ok(!p.roleCan({ role: "OWNER", status }, "sync"));
  assert.equal(p.effectiveStatus({ plan: "growth", status: "active", trialEndsAt: new Date(0), expiresAt: null }), "active");
});
