/**
 * AI panel providers. Each is enabled simply by adding its key in Vercel;
 * models can be changed with the *_MODEL variables without a code change.
 * `trainsOnInput` marks free tiers whose terms allow the provider to use
 * prompts to improve its products — those never receive a customer's data
 * unless ANITRYA_AI_ALLOW_TRAINING_PROVIDERS=true (founder testing only).
 */
export type ProviderId = "gemini" | "groq" | "cerebras" | "openrouter" | "github" | "mistral" | "openai" | "anthropic";

export type ProviderConfig = {
  id: ProviderId;
  label: string;
  keyEnv: string;
  /** Other variable names accepted for the same key (e.g. GROQ_API). */
  keyAliases?: string[];
  modelEnv: string;
  defaultModel: string;
  kind: "openai" | "gemini" | "anthropic";
  baseUrl: string;
  trainsOnInput: boolean;
};

export const PROVIDERS: ProviderConfig[] = [
  { id: "groq", label: "Groq", keyEnv: "GROQ_API_KEY", keyAliases: ["GROQ_API"], modelEnv: "GROQ_MODEL", defaultModel: "llama-3.3-70b-versatile", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", trainsOnInput: false },
  { id: "cerebras", label: "Cerebras", keyEnv: "CEREBRAS_API_KEY", keyAliases: ["CEREBRAS_API"], modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", kind: "openai", baseUrl: "https://api.cerebras.ai/v1", trainsOnInput: false },
  { id: "openrouter", label: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", keyAliases: ["OPENROUTER_API"], modelEnv: "OPENROUTER_MODEL", defaultModel: "meta-llama/llama-3.3-70b-instruct:free", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", trainsOnInput: false },
  { id: "github", label: "GitHub Models", keyEnv: "GITHUB_MODELS_TOKEN", keyAliases: ["GitHub_API", "GITHUB_API", "GITHUB_TOKEN"], modelEnv: "GITHUB_MODELS_MODEL", defaultModel: "openai/gpt-4o-mini", kind: "openai", baseUrl: "https://models.github.ai/inference", trainsOnInput: false },
  { id: "gemini", label: "Gemini", keyEnv: "GEMINI_API_KEY", keyAliases: ["GEMINI_API", "GOOGLE_AI_API_KEY"], modelEnv: "GEMINI_MODEL", defaultModel: "gemini-flash-latest", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", trainsOnInput: process.env.GEMINI_PAID_TIER !== "true" },
  { id: "mistral", label: "Mistral", keyEnv: "MISTRAL_API_KEY", keyAliases: ["MISTRAL_API"], modelEnv: "MISTRAL_MODEL", defaultModel: "mistral-small-latest", kind: "openai", baseUrl: "https://api.mistral.ai/v1", trainsOnInput: process.env.MISTRAL_PAID_TIER !== "true" },
  { id: "openai", label: "ChatGPT", keyEnv: "OPENAI_API_KEY", keyAliases: ["OPENAI_API"], modelEnv: "OPENAI_MODEL", defaultModel: "gpt-4o-mini", kind: "openai", baseUrl: "https://api.openai.com/v1", trainsOnInput: false },
  { id: "anthropic", label: "Claude", keyEnv: "ANTHROPIC_API_KEY", keyAliases: ["ANTHROPIC_API", "CLAUDE_API_KEY"], modelEnv: "ANTHROPIC_MODEL", defaultModel: "claude-haiku-4-5", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", trainsOnInput: false },
];

/** The key for a provider from its main variable or any accepted alias. */
export function providerKey(p: ProviderConfig): string | null {
  for (const name of [p.keyEnv, ...(p.keyAliases ?? [])]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function availableProviders(options: { allowTraining: boolean }) {
  return PROVIDERS.filter((p) => Boolean(providerKey(p)) && (options.allowTraining || !p.trainsOnInput));
}

export function providerSummary() {
  return PROVIDERS.map((p) => ({ id: p.id, label: p.label, configured: Boolean(providerKey(p)), trainsOnInput: p.trainsOnInput, keyEnv: p.keyEnv }));
}

// Preferred models, most capable first. When a provider retires a model the
// next match is used automatically, so stale defaults never break the panel.
const PREFERENCES: Partial<Record<ProviderId, RegExp[]>> = {
  groq: [/llama-3\.3-70b/, /gpt-oss-120b/, /llama-4-maverick/, /llama-4-scout/, /qwen.*32b/, /llama-3\.1-8b/],
  cerebras: [/llama-3\.3-70b/, /gpt-oss-120b/, /qwen-3-.*235b/, /llama-4/, /qwen/, /llama3\.1-8b/],
  // Non-reasoning free models first: reasoning models spend the token budget thinking.
  openrouter: [/llama-3\.3-70b.*:free$/, /gemma-3-27b.*:free$/, /mistral-small.*:free$/, /qwen.*(?<!think)(?<!r1):free$/, /llama.*:free$/, /gemma.*:free$/, /:free$/],
  mistral: [/^mistral-small-latest$/, /^mistral-medium-latest$/, /^open-mistral-nemo/, /^mistral-small/],
};
const REASONING = /(^|[/-])(r1|o1|o3|o4)([-:]|$)|thinking|reason/i;
const modelCache = new Map<ProviderId, { models: string[]; at: number }>();

async function candidateModels(provider: ProviderConfig, key: string): Promise<string[]> {
  const configured = process.env[provider.modelEnv]?.trim();
  if (configured) return [configured];
  const prefs = PREFERENCES[provider.id];
  if (!prefs || provider.kind !== "openai") return [provider.defaultModel];
  const cached = modelCache.get(provider.id);
  let ids = cached && Date.now() - cached.at < 3600_000 ? cached.models : null;
  if (!ids) {
    try {
      const response = await fetch(`${provider.baseUrl}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
      const payload = await response.json().catch(() => ({}));
      ids = (payload?.data ?? []).map((m: { id?: string }) => m.id).filter((id: unknown): id is string => typeof id === "string");
      if (ids && ids.length) modelCache.set(provider.id, { models: ids, at: Date.now() });
    } catch {
      ids = null;
    }
  }
  if (!ids || ids.length === 0) return [provider.defaultModel];
  const picked: string[] = [];
  for (const pattern of prefs) {
    const match = ids.find((id) => pattern.test(id) && !picked.includes(id) && !REASONING.test(id));
    if (match) picked.push(match);
    if (picked.length >= (provider.id === "openrouter" ? 3 : 2)) break;
  }
  return picked.length ? picked : [provider.defaultModel];
}

/** Error carrying the HTTP status and any retry-after hint. */
export class ProviderError extends Error {
  status: number;
  retryAfterMs: number | null;
  constructor(message: string, status: number, retryAfterMs: number | null = null) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One JSON-mode completion. A retired model (404/400) or a rate-limited one
 * (429) falls through to the next preferred model; a short retry-after is
 * honoured once so a momentary free-tier limit doesn't cost the answer.
 */
export async function complete(provider: ProviderConfig, system: string, user: string, timeoutMs = 25_000): Promise<string> {
  const key = providerKey(provider)!;
  const models = await candidateModels(provider, key);
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) break;
      try {
        return await completeWith(provider, key, model, system, user, remaining);
      } catch (error) {
        lastError = error;
        const status = error instanceof ProviderError ? error.status : 0;
        const wait = error instanceof ProviderError ? error.retryAfterMs : null;
        if (status === 429 && attempt === 0 && wait !== null && wait <= 5000 && deadline - Date.now() > wait + 4000) {
          await sleep(wait);
          continue;
        }
        break;
      }
    }
    const status = lastError instanceof ProviderError ? lastError.status : 0;
    if (![400, 404, 429, 0].includes(status) || (status === 0 && !isEmptyReply(lastError))) break;
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

function isEmptyReply(error: unknown) {
  return error instanceof Error && /empty reply/.test(error.message);
}

async function readJson(response: Response): Promise<{ payload: any; text: string }> {
  const text = await response.text().catch(() => "");
  try {
    return { payload: text ? JSON.parse(text) : {}, text };
  } catch {
    return { payload: {}, text };
  }
}

function friendly(status: number, detail: string) {
  if (status === 402 || /prepayment|credits? (are )?depleted|insufficient.*(credit|balance|quota)/i.test(detail))
    return "no credit on this key's project — use a key from a free-tier project";
  if (status === 429) return "free-tier rate limit reached — will be used again once the limit resets";
  if (status === 401 || status === 403) return `key rejected (${detail.slice(0, 80)}) — check the key and its permissions`;
  return detail;
}

function httpError(provider: ProviderConfig, response: Response, payload: any, text: string) {
  const detail = String(payload?.error?.message ?? payload?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? (text.slice(0, 120) || response.statusText || "request failed"));
  const header = response.headers.get("retry-after");
  const retryAfter = header === null || header.trim() === "" ? NaN : Number(header);
  return new ProviderError(
    `${provider.label} ${response.status}: ${friendly(response.status, detail)}`,
    response.status,
    Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : null,
  );
}

/** Text of an OpenAI-style reply; some models return content as parts or leave it null. */
function messageText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c: { text?: string }) => c?.text ?? "").join("");
  return "";
}

async function completeWith(provider: ProviderConfig, key: string, model: string, system: string, user: string, timeoutMs: number): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);

  if (provider.kind === "gemini") {
    const response = await fetch(`${provider.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    const { payload, text } = await readJson(response);
    if (!response.ok) throw httpError(provider, response, payload, text);
    const reply = payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!reply.trim()) throw new Error(`${provider.label}: empty reply (${payload?.candidates?.[0]?.finishReason ?? payload?.promptFeedback?.blockReason ?? "no content"})`);
    return reply;
  }

  if (provider.kind === "anthropic") {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1600, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
    });
    const { payload, text } = await readJson(response);
    if (!response.ok) throw httpError(provider, response, payload, text);
    return (payload?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }

  const extraHeaders: Record<string, string> =
    provider.id === "github" ? { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" } : {};
  const send = (jsonMode: boolean) =>
    fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1600,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        // Keep any model-side thinking out of the reply and the token budget.
        ...(provider.id === "openrouter" ? { reasoning: { effort: "low", exclude: true } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  let response = await send(true);
  let { payload, text } = await readJson(response);
  // Some models reject JSON mode, or accept it and reply with nothing; the
  // prompt already asks for JSON, so retry once without it.
  // Routers such as OpenRouter report an upstream JSON-mode rejection only as
  // "Provider returned error", so any 400 gets one plain retry.
  const rejectedJson = !response.ok && response.status === 400;
  const emptyJson = response.ok && !messageText(payload).trim();
  if (rejectedJson || emptyJson) {
    response = await send(false);
    ({ payload, text } = await readJson(response));
  }
  if (!response.ok) throw httpError(provider, response, payload, text);
  const reply = messageText(payload);
  if (!reply.trim()) {
    const reason = payload?.choices?.[0]?.finish_reason ?? (payload?.choices ? "no content" : `body "${text.slice(0, 60)}"`);
    const where = response.redirected ? `, redirected to ${new URL(response.url).host}` : "";
    throw new Error(`${provider.label}: empty reply (${reason}, ${response.headers.get("content-type") ?? "no content-type"}${where})`);
  }
  return reply;
}
