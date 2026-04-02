"use client";

import { useState } from "react";

type Props = {
  projectId: string;
};

export function CustomerSheetExportButton({ projectId }: Props) {
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function runExport() {
    try {
      setStatus("running");
      setMessage("");

      const response = await fetch("/api/intelligence/export-customer-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Export failed.");
      }

      setStatus("success");
      setMessage(payload?.sheetUrl ?? "Export completed.");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message ?? "Export failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        Export customer sheet
      </div>

      <div className="mt-2 text-sm leading-6 text-white/60">
        Export project-facing evidence and intelligence outputs into the customer
        sheet layer.
      </div>

      <button
        type="button"
        onClick={runExport}
        disabled={status === "running"}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "running" ? "Exporting..." : "Export now"}
      </button>

      <div className="mt-3 break-all text-xs text-white/50">
        {status === "idle"
          ? "Use this after sync so downstream exports reflect current evidence."
          : message}
      </div>
    </div>
  );
}