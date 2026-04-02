"use client";

import { SyncRunButton } from "@/components/settings/SyncRunButton";
import { CustomerSheetExportButton } from "@/components/settings/CustomerSheetExportButton";

type Props = {
  projectId: string;
  projectLabel: string;
  workspaceId: string;
};

export function SettingsControlBar({
  projectId,
  projectLabel,
  workspaceId,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Control actions</div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Run sync and export directly from Settings so project mapping,
            evidence hydration, and downstream intelligence can be advanced from
            one place.
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Active project
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {projectLabel || "No project selected"}
              </div>
              <div className="mt-2 text-sm text-white/55">
                {projectId || "unresolved"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Workspace
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {workspaceId || "missing"}
              </div>
              <div className="mt-2 text-sm text-white/55">
                Required for stable cross-tab project context.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Control goal
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                Hydrate evidence
              </div>
              <div className="mt-2 text-sm text-white/55">
                Use sync first, then verify downstream section readiness.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
          <SyncRunButton projectId={projectId} />
          <CustomerSheetExportButton projectId={projectId} />
        </div>
      </div>
    </div>
  );
}