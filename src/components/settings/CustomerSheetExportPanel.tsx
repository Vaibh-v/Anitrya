"use client";

import { useMemo, useState } from "react";

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

type ExportState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
  sheetUrl?: string;
};

export function CustomerSheetExportPanel({
  projectId,
  projectLabel,
  hasProject,
  dateRange,
}: Props) {
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [state, setState] = useState<ExportState>({
    status: "idle",
    message:
      "Paste a Google Sheets URL or spreadsheet ID, then export structured customer-facing output.",
  });

  const canExport = useMemo(() => {
    return Boolean(hasProject && spreadsheetInput.trim()) && state.status !== "running";
  }, [hasProject, spreadsheetInput, state.status]);

  async function handleExport() {
    if (!hasProject) {
      setState({
        status: "error",
        message: "Resolve a valid project before export.",
      });
      return;
    }

    if (!spreadsheetInput.trim()) {
      setState({
        status: "error",
        message: "Spreadsheet URL or ID is required.",
      });
      return;
    }

    setState({
      status: "running",
      message: "Exporting customer sheet...",
    });

    try {
      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          projectLabel,
          spreadsheetInput,
          from: dateRange.from,
          to: dateRange.to,
          preset: dateRange.preset ?? null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer sheet export failed.");
      }

      setState({
        status: "success",
        message: "Customer sheet export completed successfully.",
        sheetUrl: payload?.sheetUrl,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Customer sheet export failed.",
      });
    }
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr] xl:items-start">
        <div>
          <div className="text-2xl font-semibold text-white">Customer sheet export</div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Export customer-facing evidence and structured intelligence outputs for the
            currently selected project and date range.
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Project
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {projectLabel || "No project selected"}
              </div>
              <div className="mt-2 text-sm text-white/55">{projectId}</div>
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
                {state.status}
              </div>
              <div className="mt-2 text-sm text-white/55">
                Run export after sync so evidence reflects the latest data.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-black/16 p-4">
          <label className="block">
            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
              Spreadsheet URL or ID
            </div>
            <input
              type="text"
              value={spreadsheetInput}
              onChange={(event) => setSpreadsheetInput(event.target.value)}
              placeholder="Paste Google Sheets URL or spreadsheet ID"
              className="w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            />
          </label>

          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.status === "running" ? "Exporting..." : "Export customer sheet"}
          </button>

          <div
            className={`mt-4 rounded-[16px] border px-4 py-4 text-sm leading-6 ${
              state.status === "error"
                ? "border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
                : state.status === "success"
                ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
                : "border-white/10 bg-white/[0.03] text-white/65"
            }`}
          >
            <div>{state.message}</div>

            {state.sheetUrl ? (
              <a
                href={state.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-cyan-200 underline"
              >
                Open spreadsheet
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}