/**
 * Anitrya AI consensus: the measured data decides what is true; AI models only
 * explain it. For one finding, every available model receives the same
 * evidence packet and must answer in JSON, citing each number it relies on.
 *
 * 1. Verify — every cited number is checked against the packet; answers whose
 *    numbers don't match are down-weighted or dropped.
 * 2. Tally — proposed causes are grouped across models by word overlap; a cause
 *    backed by more models (and more trusted models) ranks higher.
 * 3. Weight — each model's vote is scaled by its verification score and its
 *    learned track record for this kind of finding (defaults to 1).
 * 4. Remember — the result is cached by evidence hash so the same question on
 *    the same data is answered instantly and never paid for twice.
 */
import crypto from "node:crypto";
import type { IntelligenceInsight } from "@/lib/intelligence/contracts";
import { availableProviders, complete, type ProviderConfig } from "@/lib/ai/providers";

export type ModelAnswer = {
  provider: string;
  ok: boolean;
  error?: string;
  explanation?: string;
  causes?: Array<{ cause: string; likelihood: number }>;
  action?: string;
  numbersCited?: number[];
  verification?: number;
  weight?: number;
  ms: number;
};

export type Consensus = {
  evidenceHash: string;
  question: string;
  summary: string | null;
  causes: Array<{ cause: string; support: number; models: string[] }>;
  action: string | null;
  agreement: "strong" | "partial" | "weak" | "none";
  models: ModelAnswer[];
  generatedAt: string;
};

const SYSTEM = `You are a senior marketing analyst. You receive one finding computed from a business's real Google Analytics and Search Console data.
Rules:
- Use ONLY the numbers in the evidence. Never invent figures.
- Explain in plain language why this is likely happening, for a business owner.
- Propose 1-3 likely causes, each with a likelihood from 0 to 1.
- Give one concrete next action.
- Keep the explanation under 120 words and each cause under 25 words.
- List every number you mention in "numbers_cited".
Reply with JSON only: {"explanation": string, "causes": [{"cause": string, "likelihood": number}], "action": string, "numbers_cited": number[]}`;

const bench_until = new Map<string, number>();

/** How long a provider sits out after a failure: long for broken keys/credit, short for rate limits. */
export function benchMinutes(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b(401|402|403)\b|no credit|key rejected|empty reply/i.test(message)) return 60;
  if (/\b429\b|rate limit/i.test(message)) return 10;
  return 0;
}

function bench(id: string, error: unknown) {
  const minutes = benchMinutes(error);
  if (minutes > 0) bench_until.set(id, Date.now() + minutes * 60_000);
}

function benched(id: string) {
  const until = bench_until.get(id);
  return until !== undefined && until > Date.now();
}

const QUORUM = 2;
const GRACE_MS = 4000;

/**
 * Runs every task; resolves when all finish, or GRACE_MS after `quorum` of
 * them succeed. Tasks still running then are reported as skipped for time.
 */
export async function settleWithQuorum(tasks: Array<{ label: string; run: () => Promise<ModelAnswer> }>, quorum: number, graceMs: number): Promise<ModelAnswer[]> {
  const results: Array<ModelAnswer | undefined> = new Array(tasks.length);
  const started = Date.now();
  return new Promise((resolve) => {
    let done = 0;
    let okCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (timer) clearTimeout(timer);
      resolve(tasks.map((t, i) => results[i] ?? { provider: t.label, ok: false, error: "Skipped: slower than the other models", ms: Date.now() - started }));
    };
    if (tasks.length === 0) return resolve([]);
    tasks.forEach((task, i) => {
      task.run().then((answer) => {
        results[i] = answer;
        done++;
        if (answer.ok) okCount++;
        if (done === tasks.length) return finish();
        if (okCount >= quorum && !timer) timer = setTimeout(finish, graceMs);
      });
    });
  });
}

export function evidencePacket(insight: IntelligenceInsight) {
  return {
    finding: insight.title,
    detail: insight.finding,
    category: insight.category,
    window: { from: insight.analysisWindowFrom, to: insight.analysisWindowTo },
    impact: insight.impactValue ? { value: insight.impactValue, unit: insight.impactUnit } : undefined,
    comparison: insight.comparison,
    // Findings keep a compact table; questions carry their lookups too.
    rows: insight.rows ? { headers: insight.rowHeaders, rows: insight.rows.slice(0, insight.rows.some((r) => r.label.startsWith("[")) ? 45 : 8) } : undefined,
    engineAction: insight.recommendedAction,
  };
}

/** Every number that appears in the packet, in the forms a model may quote. */
export function allowedNumbers(packet: unknown): number[] {
  const text = JSON.stringify(packet);
  const numbers = new Set<number>();
  for (const match of text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) {
    const value = Number(match[0].replace(/,/g, ""));
    if (Number.isFinite(value)) numbers.add(value);
  }
  return [...numbers];
}

/** Share of cited numbers that match the evidence (±1.5% or rounding). Years and small counts are free. */
export function verificationScore(cited: number[], allowed: number[]): number {
  const checked = cited.filter((n) => Number.isFinite(n) && Math.abs(n) > 10 && !(n >= 1990 && n <= 2100 && Number.isInteger(n)));
  if (checked.length === 0) return 1;
  const ok = checked.filter((n) =>
    allowed.some((a) => Math.abs(a - n) <= Math.max(1, Math.abs(a) * 0.015) || Math.round(a) === Math.round(n)),
  );
  return ok.length / checked.length;
}

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "is", "are", "be", "with", "from", "that", "this", "their", "your", "by", "as", "at", "it", "its", "more", "less", "than"]);
function tokens(text: string) {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
}
function similarity(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  ta.forEach((t) => tb.has(t) && shared++);
  return shared / Math.min(ta.size, tb.size);
}

function parseAnswer(raw: string) {
  if (!raw.trim()) throw new Error("empty reply");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let parsed: any;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    throw new Error("reply was not valid JSON");
  }
  return {
    explanation: typeof parsed.explanation === "string" ? parsed.explanation.trim() : "",
    causes: Array.isArray(parsed.causes)
      ? parsed.causes
          .filter((c: { cause?: unknown }) => typeof c?.cause === "string")
          .slice(0, 3)
          .map((c: { cause: string; likelihood?: unknown }) => ({ cause: c.cause.trim(), likelihood: Math.max(0, Math.min(1, Number(c.likelihood) || 0.5)) }))
      : [],
    action: typeof parsed.action === "string" ? parsed.action.trim() : "",
    numbersCited: Array.isArray(parsed.numbers_cited) ? parsed.numbers_cited.map(Number).filter(Number.isFinite) : [],
  };
}

export function tallyCauses(answers: ModelAnswer[]) {
  const groups: Array<{ cause: string; support: number; models: Set<string> }> = [];
  for (const answer of answers) {
    if (!answer.ok || !answer.causes) continue;
    for (const cause of answer.causes) {
      const vote = (answer.weight ?? 1) * cause.likelihood;
      const group = groups.find((g) => similarity(g.cause, cause.cause) >= 0.5);
      if (group) {
        group.support += vote;
        group.models.add(answer.provider);
      } else {
        groups.push({ cause: cause.cause, support: vote, models: new Set([answer.provider]) });
      }
    }
  }
  return groups
    .sort((a, b) => b.models.size - a.models.size || b.support - a.support)
    .slice(0, 4)
    .map((g) => ({ cause: g.cause, support: Math.round(g.support * 100) / 100, models: [...g.models] }));
}

export function evidenceHash(insight: IntelligenceInsight, question: string) {
  return crypto.createHash("sha256").update(JSON.stringify({ p: evidencePacket(insight), question })).digest("hex").slice(0, 32);
}

export async function runConsensus(input: {
  insight: IntelligenceInsight;
  question?: string;
  allowTraining: boolean;
  weightFor?: (provider: string, category: string) => number;
  /** Share provider health across instances (off in tests). */
  persistHealth?: boolean;
}): Promise<Consensus> {
  const question = input.question?.trim() || "Why is this happening, and what should we do first?";
  const packet = evidencePacket(input.insight);
  const allowed = allowedNumbers(packet);
  // Providers that just failed for a lasting reason sit out for a while, so a
  // broken key never slows the panel; they rejoin on their own once it works.
  // A benched provider (see benchMinutes) is skipped on every server instance.
  const shared = input.persistHealth ? await import("@/lib/ai/provider-health").catch(() => null) : null;
  const benchedShared = shared ? await shared.benchedProviders().catch(() => new Set<string>()) : new Set<string>();
  const providers: ProviderConfig[] = availableProviders({ allowTraining: input.allowTraining }).filter((p) => !benched(p.id) && !benchedShared.has(p.id));
  const user = `Question: ${question}\n\nEvidence (JSON):\n${JSON.stringify(packet)}`;

  const health: Array<{ id: string; ok: boolean; error?: string; ms: number; benchMinutes: number }> = [];
  const ask = async (provider: ProviderConfig): Promise<ModelAnswer> => {
    const t0 = Date.now();
    try {
      // One retry when a model answers in prose or cuts its JSON short.
      const parsed = await complete(provider, SYSTEM, user)
        .then(parseAnswer)
        .catch(async (error) => {
          if (!(error instanceof Error) || !/not valid JSON|empty reply/.test(error.message)) throw error;
          return parseAnswer(await complete(provider, SYSTEM, `${user}\n\nReply with one short, complete JSON object only.`));
        });
      const verification = verificationScore(parsed.numbersCited, allowed);
      const trust = input.weightFor?.(provider.id, input.insight.category) ?? 1;
      health.push({ id: provider.id, ok: true, ms: Date.now() - t0, benchMinutes: 0 });
      return {
        provider: provider.label,
        ok: verification >= 0.6 && parsed.explanation.length > 0,
        ...(verification < 0.6 ? { error: "Cited numbers that don't match the data" } : {}),
        ...parsed,
        verification: Math.round(verification * 100) / 100,
        weight: Math.round(trust * verification * 100) / 100,
        ms: Date.now() - t0,
      };
    } catch (error) {
      bench(provider.id, error);
      const message = error instanceof Error ? error.message.slice(0, 160) : "Failed";
      health.push({ id: provider.id, ok: false, error: message, ms: Date.now() - t0, benchMinutes: benchMinutes(error) });
      return { provider: provider.label, ok: false, error: message, ms: Date.now() - t0 };
    }
  };

  // Quorum: once two verified answers are in, slower models get a short grace
  // period instead of holding the whole answer until their timeout.
  const models = await settleWithQuorum(providers.map((p) => ({ label: p.label, run: () => ask(p) })), QUORUM, GRACE_MS);
  if (shared) void shared.recordProviderResults(health);

  const valid = models.filter((m) => m.ok);
  const causes = tallyCauses(valid);
  const best = [...valid].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
  const topShare = causes[0] && valid.length > 0 ? causes[0].models.length / valid.length : 0;
  const agreement: Consensus["agreement"] =
    valid.length === 0 ? "none" : valid.length === 1 ? "weak" : topShare >= 0.99 ? "strong" : topShare >= 0.5 ? "partial" : "weak";

  return {
    evidenceHash: evidenceHash(input.insight, question),
    question,
    summary: best?.explanation ?? null,
    causes,
    action: best?.action || input.insight.recommendedAction || null,
    agreement,
    models,
    generatedAt: new Date().toISOString(),
  };
}
