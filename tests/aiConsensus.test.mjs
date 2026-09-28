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

test("empty or non-JSON replies give a clear error", async () => {
  const p = await import("../src/lib/ai/providers.ts");
  const provider = p.PROVIDERS.find((x) => x.id === "github");
  process.env.GITHUB_MODELS_TOKEN = "t";
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    const content = calls.length === 1 ? "" : '{"explanation":"ok"}';
    return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] }), { status: 200 });
  };
  try {
    const out = await p.complete(provider, "s", "u");
    assert.equal(out, '{"explanation":"ok"}', "an empty JSON-mode reply is retried without JSON mode");
    assert.ok(calls[0].response_format && !calls[1].response_format);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.GITHUB_MODELS_TOKEN;
  }
});

test("rate-limited model falls through to the next one", async () => {
  const p = await import("../src/lib/ai/providers.ts");
  const provider = p.PROVIDERS.find((x) => x.id === "openrouter");
  process.env.OPENROUTER_API_KEY = "k";
  const realFetch = globalThis.fetch;
  const used = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "a/llama-3.3-70b-instruct:free" }, { id: "google/gemma-3-27b-it:free" }] }));
    const body = JSON.parse(init.body);
    used.push(body.model);
    if (used.length === 1) return new Response(JSON.stringify({ error: { message: "busy" } }), { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  try {
    assert.equal(await p.complete(provider, "s", "u"), "{}");
    assert.deepEqual(used, ["a/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free"]);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.OPENROUTER_API_KEY;
  }
});

test("a bare 400 from a router is retried without JSON mode", async () => {
  const p = await import("../src/lib/ai/providers.ts");
  const provider = p.PROVIDERS.find((x) => x.id === "github");
  process.env.GITHUB_MODELS_TOKEN = "t";
  const realFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    if (body.response_format) return new Response(JSON.stringify({ error: { message: "Provider returned error" } }), { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  try {
    assert.equal(await p.complete(provider, "s", "u"), "{}");
    assert.equal(bodies.length, 2);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.GITHUB_MODELS_TOKEN;
  }
});

test("failing providers sit out: long for broken keys, short for rate limits", () => {
  assert.equal(c.benchMinutes(new Error("Gemini 402: no credit on this key's project")), 60);
  assert.equal(c.benchMinutes(new Error("GitHub Models: empty reply (body \"OK\")")), 60);
  assert.equal(c.benchMinutes(new Error("Mistral 429: free-tier rate limit reached")), 10);
  assert.equal(c.benchMinutes(new Error("reply was not valid JSON")), 0);
});

test("quorum: two verified answers don't wait for a slow model", async () => {
  const ok = (p, ms) => ({ label: p, run: () => new Promise((r) => setTimeout(() => r({ provider: p, ok: true, ms }), ms)) });
  const t0 = Date.now();
  const out = await c.settleWithQuorum([ok("A", 10), ok("B", 20), ok("Slow", 5000)], 2, 100);
  assert.ok(Date.now() - t0 < 1000);
  assert.deepEqual(out.map((m) => [m.provider, m.ok]), [["A", true], ["B", true], ["Slow", false]]);
});
