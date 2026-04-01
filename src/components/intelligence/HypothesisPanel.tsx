"use client";

import { useEffect, useState } from "react";

type HypothesisResponse = {
  ok?: boolean;
  error?: string;
  hypotheses?: Array<{
    id: string;
    title: string;
    category: "overview" | "seo" | "behavior" | "cross_source";
    confidence: "low" | "medium" | "high";
    score: number;
    summary: string;
    evidence: string[];
    blockers?: string[];
    actions: string[];
    nextStep: string;
    learning?: {
      scoreAdjustment: number;
      confidenceAdjustment: 0 | 1 | 2;
      reliabilityLabel: "low" | "medium" | "high";
    };
  }>;
};

export function HypothesisPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<HypothesisResponse["hypotheses"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/hypotheses?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((data: HypothesisResponse) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to load hypotheses.");
          return;
        }
        setItems(data.hypotheses ?? []);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Failed to load hypotheses.");
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

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        No ranked hypotheses are available yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">Ranked hypotheses</div>
      <div className="mt-2 text-sm text-white/60">
        The current strongest explanations based on evidence coverage, outcome history, and cross-source readiness.
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/16 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-white/60">
                  {item.summary}
                </div>
                {item.learning?.scoreAdjustment !== 0 ? (
                  <div className="mt-2 text-xs text-cyan-300/70">
                    Learning impact: {item.learning.scoreAdjustment > 0 ? "+" : ""}
                    {item.learning.scoreAdjustment} • reliability {item.learning.reliabilityLabel}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-white/40">
                    No material learning adjustment has been applied yet.
                  </div>
                )}
              </div>

              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                {item.confidence} • {item.score}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                  Evidence
                </div>
                <div className="mt-3 space-y-2">
                  {item.evidence.map((evidence, index) => (
                    <div key={index} className="text-xs text-white/60">
                      {evidence}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                  Actions
                </div>
                <div className="mt-3 space-y-2">
                  {item.actions.map((action, index) => (
                    <div key={index} className="text-xs text-white/60">
                      {action}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                  Next step
                </div>
                <div className="mt-3 text-xs text-white/60">{item.nextStep}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/40">
              Based on hypothesis category: {item.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}