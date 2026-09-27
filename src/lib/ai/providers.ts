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
  openrouter: [/llama-3\.3-70b.*:free$/, /deepseek.*:free$/, /qwen.*:free$/, /gemma.*:free$/, /mistral.*:free$/, /:free$/],
  mistral: [/^mistral-small-latest$/, /^mistral-medium-latest$/, /^open-mistral-nemo/, /^mistral-small/],
};
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
    const match = ids.find((id) => pattern.test(id) && !picked.includes(id));
    if (match) picked.push(match);
    if (picked.length >= 2) break;
  }
  return picked.length ? picked : [provider.defaultModel];
}

/** One JSON-mode completion; tries the next preferred model if one is retired. */
export async function complete(provider: ProviderConfig, system: string, user: string, timeoutMs = 25_000): Promise<string> {
  const key = providerKey(provider)!;
  const models = await candidateModels(provider, key);
  let lastError: unknown = null;
  for (const model of models) {
    try {
      return await completeWith(provider, key, model, system, user, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error && /\b(404|400)\b/.test(error.message))) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

async function readJson(response: Response): Promise<{ payload: any; text: string }> {
  const text = await response.text().catch(() => "");
  try {
    return { payload: text ? JSON.parse(text) : {}, text };
  } catch {
    return { payload: {}, text };
  }
}

function httpError(provider: ProviderConfig, response: Response, payload: any, text: string) {
  const detail = payload?.error?.message ?? payload?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? (text.slice(0, 120) || response.statusText || "request failed");
  return new Error(`${provider.label} ${response.status}: ${detail}`);
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
    return payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  }

  if (provider.kind === "anthropic") {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 900, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
    });
    const { payload, text } = await readJson(response);
    if (!response.ok) throw httpError(provider, response, payload, text);
    return (payload?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }

  const send = (jsonMode: boolean) =>
    fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  let response = await send(true);
  let { payload, text } = await readJson(response);
  // Some models reject JSON mode; the prompt already asks for JSON, so retry without it.
  if (!response.ok && response.status === 400 && /response_format|json/i.test(text)) {
    response = await send(false);
    ({ payload, text } = await readJson(response));
  }
  if (!response.ok) throw httpError(provider, response, payload, text);
  return payload?.choices?.[0]?.message?.content ?? "";
}
