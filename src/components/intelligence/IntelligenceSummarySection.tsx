"use client";

import { useEffect, useState } from "react";
import { IntelligenceSummaryPanel } from "@/components/intelligence/IntelligenceSummaryPanel";
import { MemorySnapshotPanel } from "@/components/intelligence/MemorySnapshotPanel";
import { SourceCoveragePanel } from "@/components/intelligence/SourceCoveragePanel";

type PageSummaryResponse = {
  ok?: boolean;
  error?: string;
  summary?: {
    projectId: string;
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
  memory?: Array<{
    id: string;
    projectId: string;
    createdAt: string;
    headline: string;
    summary: string;
    categories: string[];
    confidence: "low" | "medium" | "high";
  }>;
  stats?: {
    evidenceCount: number;
    missingCount: number;
    actionCount: number;
    memoryCount: number;
  };
};

export function IntelligenceSummarySection({
  projectId,
}: {
  projectId: string;
}) {
  const [payload, setPayload] = useState<PageSummaryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/intelligence/page-summary?project=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((data: PageSummaryResponse) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to load intelligence section.");
          return;
        }
        setPayload(data);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Failed to load intelligence section."
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

  if (!payload?.summary || !payload.memory || !payload.stats) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        Loading intelligence evidence layer...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SourceCoveragePanel
        evidenceCount={payload.stats.evidenceCount}
        missingCount={payload.stats.missingCount}
      />
      <IntelligenceSummaryPanel projectId={projectId} />
      <MemorySnapshotPanel snapshots={payload.memory} />
    </div>
  );
}