"use client";

import { useState } from "react";

type Props = {
  projectId: string;
};

export function SyncRunButton({ projectId }: Props) {
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function runSync() {
    try {
      setStatus("running");
      setMessage("");

      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Sync failed.");
      }

      setStatus("success");
      setMessage(payload?.ranAt ? `Sync completed at ${payload.ranAt}` : "Sync completed.");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message ?? "Sync failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        Run sync
      </div>

      <div className="mt-2 text-sm leading-6 text-white/60">
        Pull GA4 and GSC source data, normalize it, and push it into storage for
        downstream evidence layers.
      </div>

      <button
        type="button"
        onClick={runSync}
        disabled={status === "running"}
        className="mt-4 w-full rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-sm font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "running" ? "Running sync..." : "Run sync now"}
      </button>

      <div className="mt-3 text-xs text-white/50">
        {status === "idle"
          ? "Use this after confirming project mapping."
          : message}
      </div>
    </div>
  );
}