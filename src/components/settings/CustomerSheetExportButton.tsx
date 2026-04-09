"use client";

import { useState } from "react";

type ExportState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type Props = {
  projectId: string;
  projectLabel: string;
  from: string;
  to: string;
};

export function CustomerSheetExportButton({
  projectId,
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
    if (!projectId || !from || !to) {
      setState({
        status: "error",
        message: "project, spreadsheetId, from, and to are required.",
      });
      return;
    }

    if (!spreadsheetId.trim()) {
      setState({
        status: "error",
        message: "project, spreadsheetId, from, and to are required.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          project: projectId,
          spreadsheetId: spreadsheetId.trim(),
          from,
          to,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        note?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Customer sheet export failed.");
      }

      setState({
        status: "success",
        message: payload.note ?? "Customer sheet export completed successfully.",
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
    <section className="grid gap-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,79,0.88),rgba(5,15,39,0.94))] px-8 py-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <h2 className="text-[34px] font-semibold tracking-[-0.03em] text-white">
          Customer sheet export
        </h2>
        <p className="mt-4 max-w-[760px] text-[18px] leading-10 text-white/72">
          Export customer-facing evidence and structured intelligence outputs for the currently selected project and date range.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/10 px-6 py-6">
            <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Project</div>
            <div className="mt-5 text-[21px] font-semibold text-white">{projectLabel}</div>
            <div className="mt-3 text-[16px] text-white/58">{projectId}</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/10 px-6 py-6">
            <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Date range</div>
            <div className="mt-5 text-[21px] font-semibold leading-10 text-white">
              {from} → {to}
            </div>
            <div className="mt-3 text-[16px] text-white/58">
              Export window currently in use.
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/10 px-6 py-6">
            <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Export state</div>
            <div className="mt-5 text-[21px] font-semibold text-white">{state.status}</div>
            <div className="mt-3 text-[16px] leading-8 text-white/58">
              Run export after sync so evidence reflects the latest data.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 px-7 py-7">
        <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
          Spreadsheet URL or ID
        </div>

        <input
          value={spreadsheetId}
          onChange={(event) => setSpreadsheetId(event.target.value)}
          placeholder="Paste Google Sheets URL or spreadsheet ID"
          className="mt-7 h-16 w-full rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none placeholder:text-white/28"
        />

        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="mt-7 h-16 w-full rounded-[18px] border border-white/12 bg-white/3 text-[18px] font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Exporting..." : "Export customer sheet"}
        </button>

        <div
          className={`mt-8 rounded-[22px] border px-5 py-5 text-[16px] leading-8 ${
            state.status === "error"
              ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
              : state.status === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/4 text-white/72"
          }`}
        >
          {state.message}
        </div>
      </div>
    </section>
  );
}