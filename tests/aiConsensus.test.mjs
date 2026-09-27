import assert from "node:assert/strict";
import { test } from "node:test";
import "./tsResolveHooks.mjs";

const c = await import("../src/lib/ai/consensus.ts");

test("cited numbers are verified against the evidence", () => {
  const allowed = c.allowedNumbers({ a: "1,596 of 2,524 sessions", b: 63.3 });
  assert.equal(c.verificationScore([1596, 2524, 63.3], allowed), 1);
  assert.equal(c.verificationScore([1596, 99999], allowed), 0.5);
  assert.equal(c.verificationScore([3, 2026], allowed), 1, "small counts and years are not penalised");
});

test("causes proposed by more models rank first", () => {
  const causes = c.tallyCauses([
    { provider: "A", ok: true, weight: 1, ms: 1, causes: [{ cause: "Titles do not match search intent", likelihood: 0.7 }, { cause: "Seasonal demand drop", likelihood: 0.3 }] },
    { provider: "B", ok: true, weight: 1, ms: 1, causes: [{ cause: "Page titles don't match the search intent", likelihood: 0.6 }] },
    { provider: "C", ok: true, weight: 1, ms: 1, causes: [{ cause: "Competitors added rich snippets", likelihood: 0.9 }] },
  ]);
  assert.equal(causes[0].models.length, 2);
  assert.match(causes[0].cause, /intent/);
});
