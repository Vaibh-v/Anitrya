"use client";

import { useState } from "react";

type Consensus = {
  summary: string | null;
  causes: Array<{ cause: string; support: number; models: string[] }>;
  action: string | null;
  agreement: "strong" | "partial" | "weak" | "none";
  models: Array<{ provider: string; ok: boolean; error?: string; verification?: number; ms: number }>;
};

const AGREEMENT: Record<Consensus["agreement"], string> = {
  strong: "All models agree",
  partial: "Most models agree",
  weak: "Models disagree — treat as a lead",
  none: "No model gave a verified answer",
};

/** Asks the AI panel about one finding; answers are checked against the data. */
export function ExplainWithAI(props: { project: string; insightId: string; from: string; to: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Consensus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  async function ask(custom?: string) {
    setState("loading");
    setError(null);
    const payload = await fetch("/api/intelligence/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...props, question: custom }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (payload?.ok) {
      setResult(payload.consensus);
      setState("done");
    } else {
      setError(payload?.error ?? "The AI panel is unavailable right now.");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button type="button" className="eye-button eye-ai-button" onClick={() => ask()}>
        Explain with AI
      </button>
    );
  }

  return (
    <div className="eye-ai">
      {state === "loading" ? <p className="eye-panel-text">Asking the AI panel and checking every number against your data…</p> : null}
      {state === "error" ? <p className="eye-message is-error">{error}</p> : null}
      {result ? (
        <>
          <div className="eye-ai-head">
            <strong>AI panel</strong>
            <span className={`eye-tag ${result.agreement === "strong" ? "eye-tag-green" : result.agreement === "weak" || result.agreement === "none" ? "eye-tag-amber" : ""}`}>
              {AGREEMENT[result.agreement]}
            </span>
          </div>
          {result.summary ? <p>{result.summary}</p> : null}
          {result.causes.length > 0 ? (
            <ol className="eye-ai-causes">
              {result.causes.map((c) => (
                <li key={c.cause}>
                  {c.cause} <span className="eye-finding-muted">— {c.models.length} of {result.models.filter((m) => m.ok).length} models</span>
                </li>
              ))}
            </ol>
          ) : null}
          {result.action ? <p className="eye-finding-action"><span>AI suggests</span>{result.action}</p> : null}
          <p className="eye-finding-muted eye-ai-models">
            {result.models.map((m) => `${m.provider}: ${m.ok ? `verified ${Math.round((m.verification ?? 1) * 100)}%` : m.error ?? "no answer"}`).join(" · ")}
          </p>
          <form
            className="eye-ai-ask"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) ask(question.trim());
            }}
          >
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a follow-up about this finding" aria-label="Follow-up question" />
            <button type="submit" className="eye-button" disabled={!question.trim()}>Ask</button>
          </form>
        </>
      ) : null}
    </div>
  );
}
