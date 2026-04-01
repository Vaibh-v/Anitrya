"use client";

import { useState } from "react";

type Props = {
  projectSlug: string;
  hypothesisTitle: string;
  recommendationTitle: string;
  initialOutcome?: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
  initialImpactDelta?: number;
  initialOutcomeNote?: string;
};

export function OutcomeSelector({
  projectSlug,
  hypothesisTitle,
  recommendationTitle,
  initialOutcome = "accepted",
  initialImpactDelta = 0,
  initialOutcomeNote = "",
}: Props) {
  const [outcomeStatus, setOutcomeStatus] = useState(initialOutcome);
  const [impactDelta, setImpactDelta] = useState(String(initialImpactDelta));
  const [outcomeNote, setOutcomeNote] = useState(initialOutcomeNote);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(nextOutcomeStatus = outcomeStatus) {
    try {
      setState("saving");

      const response = await fetch("/api/intelligence/outcome", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectSlug,
          hypothesisTitle,
          recommendationTitle,
          outcomeStatus: nextOutcomeStatus,
          impactDelta: impactDelta.trim() === "" ? 0 : Number(impactDelta),
          outcomeNote,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to save outcome.");
      }

      setState("saved");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/16 p-4">
      <div className="grid gap-3 md:grid-cols-[160px_120px_1fr_auto] md:items-end">
        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Outcome
          </div>
          <select
            value={outcomeStatus}
            onChange={(event) => {
              const next = event.target.value as
                | "accepted"
                | "rejected"
                | "implemented"
                | "improved"
                | "no_impact";
              setOutcomeStatus(next);
            }}
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white"
          >
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="implemented">implemented</option>
            <option value="improved">improved</option>
            <option value="no_impact">no impact</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Impact Δ
          </div>
          <input
            value={impactDelta}
            onChange={(event) => setImpactDelta(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white"
            placeholder="0"
          />
        </label>

        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Note
          </div>
          <input
            value={outcomeNote}
            onChange={(event) => setOutcomeNote(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white"
            placeholder="Optional result note"
          />
        </label>

        <button
          type="button"
          onClick={() => save()}
          className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-2 text-xs text-cyan-100"
        >
          {state === "saving" ? "Saving..." : "Save outcome"}
        </button>
      </div>

      <div className="text-xs text-white/50">
        {state === "saved"
          ? "Outcome saved."
          : state === "error"
          ? "Failed to save outcome."
          : "Record what happened after this action was executed."}
      </div>
    </div>
  );
}