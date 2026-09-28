"use client";

import Link from "next/link";
import { useState } from "react";

type Answer = {
  summary: string | null;
  models: Array<{ provider: string; ok: boolean; error?: string }>;
  causes: Array<{ cause: string; models: string[] }>;
  action: string | null;
  agreement: "strong" | "partial" | "weak" | "none";
};

const SUGGESTED = ["What should we fix first this week?", "Why are sessions changing?", "Where is the biggest missed opportunity?"];

/** Overview copilot: questions go to the AI panel with every finding as evidence. */
export function OverviewCopilot(props: { project: string; from: string; to: string; seoHref: string; behaviorHref: string }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<string[]>([]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setAsked(q);
    setError(null);
    setAnswer(null);
    const payload = await fetch("/api/intelligence/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: props.project, insightId: "__overview__", from: props.from, to: props.to, question: q }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setLoading(false);
    if (payload?.ok) {
      setAnswer(payload.consensus);
      setLookups(Array.isArray(payload.lookups) ? payload.lookups : []);
    }
    else setError(payload?.error ?? "The AI panel is unavailable right now.");
  }

  const agreed = answer ? answer.models.filter((m) => m.ok).length : 0;

  return (
    <section className="eye-panel eye-copilot">
      <h2>
        Analyst copilot <span className={`eye-tag ${answer?.agreement === "strong" ? "eye-tag-green" : ""}`}>{answer ? `${agreed} ${agreed === 1 ? "model" : "models"} · checked against data` : "AI panel"}</span>
      </h2>
      {asked ? <p className="eye-chat-bubble eye-chat-question">{asked}</p> : null}
      {loading ? <p className="eye-chat-bubble">Looking up the data this question needs, then asking every connected model and checking their numbers…</p> : null}
      {error ? <p className="eye-message is-error">{error}</p> : null}
      {answer && agreed === 0 ? (
        <p className="eye-message is-error">No model gave an answer that matched your data this time ({answer.models.map((m) => m.provider).join(", ")}). Try again in a minute.</p>
      ) : null}
      {answer && agreed > 0 ? (
        <div className="eye-chat-bubble">
          {answer.summary ? <p>{answer.summary}</p> : null}
          {answer.causes.length ? (
            <ol className="eye-ai-causes">
              {answer.causes.slice(0, 3).map((c) => (
                <li key={c.cause}>
                  {c.cause} <span className="eye-finding-muted">— {c.models.length} of {agreed}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {answer.action ? <p className="eye-finding-action"><span>Do first</span>{answer.action}</p> : null}
          {lookups.length ? <p className="eye-finding-muted">Looked at: {lookups.join(" · ")}</p> : null}
        </div>
      ) : null}
      {!asked ? (
        <div className="eye-suggestions">
          {SUGGESTED.map((s) => (
            <button key={s} type="button" onClick={() => { setQuestion(s); ask(s); }}>{s}</button>
          ))}
        </div>
      ) : (
        <div className="eye-suggestions">
          <Link href={props.seoHref}>Explore search evidence ↗</Link>
          <Link href={props.behaviorHref}>Explore behavior ↗</Link>
        </div>
      )}
      <form className="eye-chat-input" onSubmit={(event) => { event.preventDefault(); ask(question); }}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your market" aria-label="Ask about your market" maxLength={400} />
        <button type="submit" disabled={loading || !question.trim()}>{loading ? "…" : "Send"}</button>
      </form>
    </section>
  );
}
