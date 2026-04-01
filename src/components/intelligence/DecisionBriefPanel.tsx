"use client";

import { useEffect, useState } from "react";

type DecisionBriefResponse = {
  ok?: boolean;
  error?: string;
  brief?: {
    projectId: string;
    headline: string;
    priority: "high" | "medium" | "low";
    summary: string;
    supportingEvidence: Array<{
      label: string;
      detail: string;
    }>;
    blockers: Array<{
      label: string;
      reason: string;
    }>;
    orderedActions: string[];
  };
};

export function DecisionBriefPanel({ projectId }: { projectId: string }) {
  const [brief, setBrief] = useState<DecisionBriefResponse["brief"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/decision-brief?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((payload: DecisionBriefResponse) => {
        if (cancelled) return;
        if (!payload.ok || !payload.brief) {
          setError(payload.error ?? "Failed to load decision brief.");
          return;
        }
        setBrief(payload.brief);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load decision brief."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        Loading decision brief...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{brief.headline}</div>
          <div className="mt-2 text-sm leading-6 text-white/65">{brief.summary}</div>
        </div>

        <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
          {brief.priority}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Supporting evidence
          </div>
          <div className="mt-3 space-y-3">
            {brief.supportingEvidence.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="text-sm text-white">{item.label}</div>
                <div className="mt-1 text-xs text-white/55">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Confidence blockers
          </div>
          <div className="mt-3 space-y-3">
            {brief.blockers.length > 0 ? (
              brief.blockers.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-lg border border-amber-400/20 bg-amber-400/[0.08] p-3"
                >
                  <div className="text-sm text-amber-100">{item.label}</div>
                  <div className="mt-1 text-xs text-amber-50/80">{item.reason}</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
                No active blockers recorded.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Ordered actions
          </div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/60">
            {brief.orderedActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}