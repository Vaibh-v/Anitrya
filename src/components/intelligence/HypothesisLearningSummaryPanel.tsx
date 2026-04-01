"use client";

import { useEffect, useState } from "react";

type LearningSummaryResponse = {
  ok?: boolean;
  error?: string;
  summary?: {
    boostedCount: number;
    penalizedCount: number;
    summary: string;
  };
};

export function HypothesisLearningSummaryPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [payload, setPayload] = useState<LearningSummaryResponse["summary"] | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/intelligence/hypothesis-learning-summary?project=${encodeURIComponent(projectId)}`
    )
      .then((response) => response.json())
      .then((data: LearningSummaryResponse) => {
        if (cancelled) return;
        if (!data.ok || !data.summary) {
          setError(data.error ?? "Failed to load hypothesis learning summary.");
          return;
        }
        setPayload(data.summary);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Failed to load hypothesis learning summary."
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

  if (!payload) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        Loading hypothesis learning summary...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">Hypothesis learning summary</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{payload.summary}</div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Boosted hypotheses
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {payload.boostedCount}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Penalized hypotheses
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {payload.penalizedCount}
          </div>
        </div>
      </div>
    </div>
  );
}