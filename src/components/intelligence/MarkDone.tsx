"use client";

import { useState } from "react";

type Outcome = { metric: string; baseline: number; measureAfter: string; measured: boolean; lift: number | null } | null;

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** "Mark as done" → Anitrya measures the result four weeks later and learns from it. */
export function MarkDone(props: { project: string; insightId: string; from: string; to: string; outcome: Outcome }) {
  const [outcome, setOutcome] = useState<Outcome>(props.outcome);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setError(null);
    const payload = await fetch("/api/intelligence/outcome", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: props.project, insightId: props.insightId, from: props.from, to: props.to }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (payload?.ok) setOutcome({ metric: payload.metric, baseline: payload.baseline, measureAfter: payload.measureAfter, measured: false, lift: null });
    else setError(payload?.error ?? "Couldn't save that right now.");
  }

  if (outcome?.measured && outcome.lift !== null) {
    const up = outcome.lift > 0.02;
    return (
      <span className={`eye-tag ${up ? "eye-tag-green" : "eye-tag-amber"}`}>
        Result: {outcome.lift >= 0 ? "+" : "−"}{Math.abs(Math.round(outcome.lift * 100))}% {outcome.metric} after 4 weeks
      </span>
    );
  }
  if (outcome) {
    return <span className="eye-tag">Done · measuring {outcome.metric} (baseline {Math.round(outcome.baseline).toLocaleString()}) — result {dateLabel(outcome.measureAfter)}</span>;
  }
  return (
    <>
      <button type="button" className="eye-button" disabled={busy} onClick={mark} title="Anitrya records today's numbers and measures the result in 4 weeks">
        {busy ? "Saving…" : "Mark as done"}
      </button>
      {error ? <span className="eye-message is-error">{error}</span> : null}
    </>
  );
}
