"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
  dateRange: {
    from: string;
    to: string;
    preset?: string;
  };
};

export function CustomerSheetExportPanel({
  projectId,
  projectLabel,
  hasProject,
  dateRange,
}: Props) {
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleExport() {
    try {
      setStatus("running");
      setMessage("");

      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          from: dateRange.from,
          to: dateRange.to,
          preset: dateRange.preset ?? null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer sheet export failed.");
      }

      setStatus("success");
      setMessage(
        payload?.sheetUrl
          ? `Export completed: ${payload.sheetUrl}`
          : "Customer sheet export completed."
      );
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message ?? "Customer sheet export failed.");
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">
            Customer sheet export
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Export customer-facing evidence and structured intelligence outputs
            for the currently selected project and date range.
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Project
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {projectLabel || "No project selected"}
              </div>
              <div className="mt-2 text-sm text-white/55">
                {hasProject ? projectId : "Resolve project context first"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Date range
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {dateRange.from} → {dateRange.to}
              </div>
              <div className="mt-2 text-sm text-white/55">
                Export window currently in use.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Export state
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {status}
              </div>
              <div className="mt-2 text-sm text-white/55">
                Run export after sync so evidence reflects the latest data.
              </div>
            </div>
          </div>
        </div>

        <div className="xl:min-w-[320px]">
          <button
            type="button"
            onClick={handleExport}
            disabled={!hasProject || status === "running"}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "running" ? "Exporting..." : "Export customer sheet"}
          </button>

          <div className="mt-3 break-all text-xs text-white/50">
            {!hasProject
              ? "Resolve a valid project before export."
              : status === "idle"
              ? "Use this after sync so downstream exports reflect current evidence."
              : message}
          </div>
        </div>
      </div>
    </div>
  );
}