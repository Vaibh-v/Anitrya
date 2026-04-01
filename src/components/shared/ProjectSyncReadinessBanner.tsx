"use client";

import { EvidenceStatusPill } from "@/components/shared/EvidenceStatusPill";

type Props = {
  title?: string;
  summary: string;
  statuses: Array<{
    label: string;
    tone: "ready" | "partial" | "missing" | "neutral";
  }>;
};

export function ProjectSyncReadinessBanner({
  title = "Project sync readiness",
  summary,
  statuses,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-white/60">{summary}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <EvidenceStatusPill
              key={status.label}
              label={status.label}
              tone={status.tone}
            />
          ))}
        </div>
      </div>
    </div>
  );
}