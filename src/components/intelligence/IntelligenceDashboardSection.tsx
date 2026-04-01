"use client";

import { useEffect, useState } from "react";
import { IntelligenceHealthStrip } from "@/components/intelligence/IntelligenceHealthStrip";
import { ActionGroupsPanel } from "@/components/intelligence/ActionGroupsPanel";

type DashboardResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    headline: string;
    projectId: string;
    summary: string;
    stats: Array<{
      label: string;
      value: number | string;
      context: string;
    }>;
    actions: Array<{
      title: string;
      impact: "low" | "medium" | "high";
      steps: string[];
    }>;
    memoryCount: number;
  };
};

export function IntelligenceDashboardSection({
  projectId,
}: {
  projectId: string;
}) {
  const [payload, setPayload] = useState<DashboardResponse["payload"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/dashboard?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((data: DashboardResponse) => {
        if (cancelled) return;
        if (!data.ok || !data.payload) {
          setError(data.error ?? "Failed to load intelligence dashboard.");
          return;
        }
        setPayload(data.payload);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Failed to load intelligence dashboard."
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
        Loading operational intelligence status...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-lg font-semibold text-white">{payload.headline}</div>
        <div className="mt-2 text-sm leading-6 text-white/65">
          {payload.summary}
        </div>
      </div>

      <IntelligenceHealthStrip stats={payload.stats} />
      <ActionGroupsPanel actions={payload.actions} />
    </div>
  );
}