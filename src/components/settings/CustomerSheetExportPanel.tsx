"use client";

import { useMemo, useState } from "react";

type CustomerSheetExportPanelProps = {
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
  dateRange: {
    from?: string;
    to?: string;
    preset?: string;
  };
};

type ExportResponse = {
  ok?: boolean;
  error?: string;
  spreadsheetId?: string;
  writtenTabs?: string[];
  projectId?: string;
};

export function CustomerSheetExportPanel({
  projectId,
  projectLabel,
  hasProject,
  dateRange,
}: CustomerSheetExportPanelProps) {
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState(
    hasProject
      ? `Ready to export ${projectLabel} to Google Sheets.`
      : "Resolve a project to enable export."
  );

  const disabled = useMemo(
    () => !hasProject || !spreadsheetInput.trim() || isSubmitting,
    [hasProject, spreadsheetInput, isSubmitting]
  );

  async function exportSheet() {
    if (disabled) return;

    try {
      setIsSubmitting(true);
      setStatus("idle");
      setMessage(`Exporting ${projectLabel}...`);

      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetInput,
          projectId,
          dateRange: {
            start: dateRange.from,
            end: dateRange.to,
            preset: dateRange.preset,
          },
        }),
      });

      const data = (await response.json()) as ExportResponse;

      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Export failed.");
        return;
      }

      const writtenTabs =
        data.writtenTabs && data.writtenTabs.length > 0
          ? data.writtenTabs.join(", ")
          : "none";

      setStatus("success");
      setMessage(
        `Export completed for ${projectLabel}. Tabs written: ${writtenTabs}.`
      );
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message ?? "Export failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            Customer sheet export
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Export project evidence
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Write normalized rows into a customer-owned Google Sheet using the
            currently resolved project context.
          </p>
        </div>

        <button
          type="button"
          onClick={exportSheet}
          disabled={disabled}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Exporting..." : "Export to sheet"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/40">
            Google Sheet URL or spreadsheet ID
          </label>
          <input
            value={spreadsheetInput}
            onChange={(event) => setSpreadsheetInput(event.target.value)}
            placeholder="Paste a Google Sheet URL or raw spreadsheet ID"
            className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Project
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {hasProject ? projectLabel : "No project selected"}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Project ID
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {hasProject ? projectId : "Unavailable"}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Date range
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {dateRange.from && dateRange.to
                ? `${dateRange.from} → ${dateRange.to}`
                : "Current preset"}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          status === "success"
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            : status === "error"
            ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
            : "border-white/10 bg-black/20 text-white/65"
        }`}
      >
        {message}
      </div>
    </section>
  );
}