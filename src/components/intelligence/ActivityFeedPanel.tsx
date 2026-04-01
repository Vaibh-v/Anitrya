"use client";

import { useEffect, useState } from "react";
import { ActivitySummaryStrip } from "@/components/intelligence/ActivitySummaryStrip";
import { ProjectLearningMomentumPanel } from "@/components/intelligence/ProjectLearningMomentumPanel";

type ActivityFeedResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    projectId: string;
    summary: string;
    counts: {
      executionCount: number;
      outcomeCount: number;
      positiveOutcomeCount: number;
      warningCount: number;
    };
    items: Array<{
      id: string;
      type: "execution" | "outcome" | "learning";
      title: string;
      description: string;
      tone: "neutral" | "positive" | "warning";
      timestamp: number;
      meta: string[];
    }>;
  };
};

function toneClasses(tone: "neutral" | "positive" | "warning") {
  if (tone === "positive") {
    return "border-emerald-400/15 bg-emerald-400/[0.05]";
  }
  if (tone === "warning") {
    return "border-amber-400/15 bg-amber-400/[0.05]";
  }
  return "border-white/10 bg-white/[0.03]";
}

export function ActivityFeedPanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<ActivityFeedResponse["payload"] | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/activity-feed?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((data: ActivityFeedResponse) => {
        if (cancelled) return;
        if (!data.ok || !data.payload) {
          setError(data.error ?? "Failed to load activity feed.");
          return;
        }
        setPayload(data.payload);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load activity feed."
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
        Loading project activity...
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <div className="text-sm font-semibold text-white">Project activity</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          {payload.summary}
        </div>
      </div>

      <ActivitySummaryStrip counts={payload.counts} />
      <ProjectLearningMomentumPanel counts={payload.counts} />

      <div className="space-y-3">
        {payload.items.length > 0 ? (
          payload.items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${toneClasses(item.tone)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    {item.description}
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/55">
                  {item.type}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.meta.map((meta, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="rounded-full border border-white/10 bg-black/16 px-2.5 py-1 text-xs text-white/45"
                  >
                    {meta}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-white/35">
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
            No execution or outcome activity has been recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}