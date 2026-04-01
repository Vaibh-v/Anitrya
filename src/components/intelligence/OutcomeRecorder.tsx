"use client";

import { useState } from "react";

type OutcomeStatus =
  | "accepted"
  | "rejected"
  | "implemented"
  | "improved"
  | "no_impact";

type Props = {
  projectId: string;
  hypothesisTitle: string;
  recommendationTitle: string;
};

const LABELS: Record<OutcomeStatus, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  implemented: "Implemented",
  improved: "Improved",
  no_impact: "No impact",
};

export function OutcomeRecorder({
  projectId,
  hypothesisTitle,
  recommendationTitle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OutcomeStatus>("accepted");
  const [impactDelta, setImpactDelta] = useState("0");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function onSubmit() {
    setState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/intelligence/record-outcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          hypothesisTitle,
          recommendationTitle,
          outcomeStatus: status,
          outcomeNote: note,
          impactDelta: Number(impactDelta || "0"),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Outcome recording failed.");
      }

      setState("success");
      setMessage("Outcome recorded. Future confidence and ranking can learn from this.");
      setOpen(false);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unknown outcome recording error.");
    }
  }

  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/54">
          Record whether this recommendation helped in the real world.
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/78 hover:bg-white/[0.05]"
        >
          {open ? "Close outcome form" : "Record outcome"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Status
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as OutcomeStatus)}
              className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none"
            >
              {Object.entries(LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Impact delta
            </span>
            <input
              value={impactDelta}
              onChange={(event) => setImpactDelta(event.target.value)}
              inputMode="numeric"
              className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none"
              placeholder="0"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Outcome note
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none"
              placeholder="What happened after this recommendation was applied?"
            />
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={state === "saving"}
            className="rounded-[12px] border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2.5 text-sm text-cyan-100 hover:bg-cyan-400/[0.14] disabled:opacity-60"
          >
            {state === "saving" ? "Saving outcome..." : "Save outcome"}
          </button>
        </div>
      ) : null}

      {message ? (
        <div
          className={`mt-4 rounded-[12px] px-3 py-2 text-sm ${
            state === "error"
              ? "border border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
              : "border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}