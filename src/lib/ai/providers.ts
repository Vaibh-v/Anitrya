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
  modelEnv: string;
  defaultModel: string;
  kind: "openai" | "gemini" | "anthropic";
  baseUrl: string;
  trainsOnInput: boolean;
};

export const PROVIDERS: ProviderConfig[] = [
  { id: "groq", label: "Groq", keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL", defaultModel: "llama-3.3-70b-versatile", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", trainsOnInput: false },
  { id: "cerebras", label: "Cerebras", keyEnv: "CEREBRAS_API_KEY", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", kind: "openai", baseUrl: "https://api.cerebras.ai/v1", trainsOnInput: false },
  { id: "openrouter", label: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "meta-llama/llama-3.3-70b-instruct:free", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", trainsOnInput: false },
  { id: "github", label: "GitHub Models", keyEnv: "GITHUB_MODELS_TOKEN", modelEnv: "GITHUB_MODELS_MODEL", defaultModel: "openai/gpt-4o-mini", kind: "openai", baseUrl: "https://models.github.ai/inference", trainsOnInput: false },
  { id: "gemini", label: "Gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-flash-latest", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", trainsOnInput: process.env.GEMINI_PAID_TIER !== "true" },
  { id: "mistral", label: "Mistral", keyEnv: "MISTRAL_API_KEY", modelEnv: "MISTRAL_MODEL", defaultModel: "mistral-small-latest", kind: "openai", baseUrl: "https://api.mistral.ai/v1", trainsOnInput: process.env.MISTRAL_PAID_TIER !== "true" },
  { id: "openai", label: "ChatGPT", keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-4o-mini", kind: "openai", baseUrl: "https://api.openai.com/v1", trainsOnInput: false },
  { id: "anthropic", label: "Claude", keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL", defaultModel: "claude-haiku-4-5", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", trainsOnInput: false },
];

export function availableProviders(options: { allowTraining: boolean }) {
  return PROVIDERS.filter((p) => Boolean(process.env[p.keyEnv]?.trim()) && (options.allowTraining || !p.trainsOnInput));
}

export function providerSummary() {
  return PROVIDERS.map((p) => ({ id: p.id, label: p.label, configured: Boolean(process.env[p.keyEnv]?.trim()), trainsOnInput: p.trainsOnInput, keyEnv: p.keyEnv }));
}

/** One JSON-mode completion; throws on HTTP or timeout errors. */
export async function complete(provider: ProviderConfig, system: string, user: string, timeoutMs = 25_000): Promise<string> {
  const key = process.env[provider.keyEnv]!.trim();
  const model = process.env[provider.modelEnv]?.trim() || provider.defaultModel;
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
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${provider.label} ${response.status}: ${payload?.error?.message ?? "request failed"}`);
    return payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  }

  if (provider.kind === "anthropic") {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 900, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${provider.label} ${response.status}: ${payload?.error?.message ?? "request failed"}`);
    return (payload?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${provider.label} ${response.status}: ${payload?.error?.message ?? "request failed"}`);
  return payload?.choices?.[0]?.message?.content ?? "";
}
