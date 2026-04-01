"use client";

import { useEffect, useState } from "react";

type OutcomeInsightsResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    projectId: string;
    summary: string;
    stats: Array<{
      label: string;
      value: string | number;
      context: string;
    }>;
    topActions: Array<{
      actionTitle: string;
      successRate: number;
      failureRate: number;
      avgImpact: number;
      sampleSize: number;
    }>;
    weakestActions: Array<{
      actionTitle: string;
      successRate: number;
      failureRate: number;
      avgImpact: number;
      sampleSize: number;
    }>;
  };
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ActionPerformanceCard({
  title,
  items,
}: {
  title: string;
  items: Array<{
    actionTitle: string;
    successRate: number;
    failureRate: number;
    avgImpact: number;
    sampleSize: number;
  }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        {title}
      </div>

      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.actionTitle}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="text-sm text-white">{item.actionTitle}</div>
              <div className="mt-2 grid gap-2 md:grid-cols-4 text-xs text-white/55">
                <div>Success: {percent(item.successRate)}</div>
                <div>Failure: {percent(item.failureRate)}</div>
                <div>Impact: {item.avgImpact.toFixed(1)}</div>
                <div>Sample: {item.sampleSize}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
            No outcome history is available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function OutcomeInsightsPanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<OutcomeInsightsResponse["payload"] | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/outcome-insights?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((data: OutcomeInsightsResponse) => {
        if (cancelled) return;
        if (!data.ok || !data.payload) {
          setError(data.error ?? "Failed to load outcome insights.");
          return;
        }
        setPayload(data.payload);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load outcome insights."
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
        Loading outcome insights...
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <div className="text-sm font-semibold text-white">Outcome insights</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          {payload.summary}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {payload.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-black/16 p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {stat.value}
            </div>
            <div className="mt-2 text-xs leading-5 text-white/50">
              {stat.context}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPerformanceCard title="Top performing actions" items={payload.topActions} />
        <ActionPerformanceCard title="Weakest performing actions" items={payload.weakestActions} />
      </div>
    </div>
  );
}