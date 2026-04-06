"use client";

import { useState } from "react";

type Props = {
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
};

type ExportState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function CustomerSheetExportButton({
  projectSlug,
  projectLabel,
  from,
  to,
}: Props) {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ExportState>({
    status: "idle",
    message:
      "Export customer-facing evidence and structured intelligence outputs for the currently selected project and date range.",
  });

  async function handleExport() {
    if (!projectSlug) {
      setState({
        status: "error",
        message: "Project slug is required for export.",
      });
      return;
    }

    if (!spreadsheetId.trim()) {
      setState({
        status: "error",
        message: "Spreadsheet URL or ID is required.",
      });
      return;
    }

    try {
      setLoading(true);
      setState({
        status: "idle",
        message: "Preparing customer sheet export...",
      });

      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          project: projectSlug,
          spreadsheetId,
          from,
          to,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Customer sheet export failed.");
      }

      setState({
        status: "success",
        message:
          payload?.note ??
          "Customer sheet export completed successfully.",
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Customer sheet export failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,32,75,0.62),rgba(4,10,24,0.88))] p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div>
          <h3 className="text-[34px] font-semibold text-white">Customer sheet export</h3>
          <p className="mt-2 max-w-[700px] text-[15px] text-white/72">
            Export customer-facing evidence and structured intelligence outputs for the currently selected project and date range.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
              <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Project</div>
              <div className="mt-3 text-[20px] font-semibold text-white">{projectLabel}</div>
              <div className="mt-2 text-sm text-white/54">{projectSlug}</div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
              <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Date range</div>
              <div className="mt-3 text-[20px] font-semibold text-white">
                {from} → {to}
              </div>
              <div className="mt-2 text-sm text-white/54">Export window currently in use.</div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
              <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Export state</div>
              <div className="mt-3 text-[20px] font-semibold text-white">
                {state.status === "idle" ? "ready" : state.status}
              </div>
              <div className="mt-2 text-sm text-white/54">
                {state.status === "success"
                  ? "Evidence export completed."
                  : "Run export after sync so evidence reflects the latest data."}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
          <label className="flex flex-col gap-3">
            <span className="text-[12px] uppercase tracking-[0.32em] text-white/46">
              Spreadsheet URL or ID
            </span>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(event) => setSpreadsheetId(event.target.value)}
              placeholder="Paste Google Sheet URL or spreadsheet ID"
              className="h-14 rounded-[18px] border border-white/12 bg-white/6 px-5 text-[15px] text-white outline-none"
            />
          </label>

          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="mt-4 h-14 w-full rounded-[18px] border border-white/12 bg-white/6 text-[16px] font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Exporting..." : "Export customer sheet"}
          </button>

          <div
            className={`mt-4 rounded-[18px] border px-5 py-4 text-[15px] ${
              state.status === "error"
                ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
                : state.status === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 bg-black/10 text-white/72"
            }`}
          >
            {state.message}
          </div>
        </div>
      </div>
    </section>
  );
}