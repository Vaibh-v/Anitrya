"use client";

import { useEffect, useState } from "react";

type SummaryResponse = {
  ok?: boolean;
  error?: string;
  summary?: {
    headline: string;
    summary: string;
    evidence: Array<{
      source: string;
      metric: string;
      value: string | number | null;
      note?: string;
    }>;
    missingData: Array<{
      source: string;
      reason: string;
    }>;
    actions: Array<{
      title: string;
      impact: "low" | "medium" | "high";
      steps: string[];
    }>;
  };
};

export function IntelligenceSummaryPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<SummaryResponse["summary"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/summary?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((payload: SummaryResponse) => {
        if (cancelled) return;
        if (!payload.ok || !payload.summary) {
          setError(payload.error ?? "Failed to load summary.");
          return;
        }
        setData(payload.summary);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load summary."
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

  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        Loading intelligence summary...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-lg font-semibold text-white">{data.headline}</div>
        <div className="mt-2 text-sm leading-6 text-white/65">
          {data.summary}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-semibold text-white">Evidence</div>
          <div className="mt-3 space-y-3">
            {data.evidence.map((item, index) => (
              <div
                key={`${item.source}-${item.metric}-${index}`}
                className="rounded-xl border border-white/10 bg-black/16 p-3"
              >
                <div className="text-sm text-white">
                  {item.source} · {item.metric}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  Value: {item.value === null ? "null" : String(item.value)}
                </div>
                {item.note ? (
                  <div className="mt-1 text-xs text-white/45">{item.note}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-semibold text-white">Missing data</div>
          <div className="mt-3 space-y-3">
            {data.missingData.map((item, index) => (
              <div
                key={`${item.source}-${index}`}
                className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3"
              >
                <div className="text-sm text-amber-100">{item.source}</div>
                <div className="mt-1 text-xs text-amber-50/80">
                  {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold text-white">
          Recommended next actions
        </div>
        <div className="mt-3 space-y-3">
          {data.actions.map((action, index) => (
            <div
              key={`${action.title}-${index}`}
              className="rounded-xl border border-white/10 bg-black/16 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium text-white">
                  {action.title}
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                  {action.impact}
                </div>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/60">
                {action.steps.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}