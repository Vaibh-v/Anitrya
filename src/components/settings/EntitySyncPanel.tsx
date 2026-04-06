"use client";

import { useMemo, useState } from "react";

type PanelState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type EntitySyncPanelProps = {
  projectSlug: string;
  projectLabel: string;
  initialFrom: string;
  initialTo: string;
};

function normalizeDateInput(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

export function EntitySyncPanel({
  projectSlug,
  projectLabel,
  initialFrom,
  initialTo,
}: EntitySyncPanelProps) {
  const [from, setFrom] = useState(normalizeDateInput(initialFrom));
  const [to, setTo] = useState(normalizeDateInput(initialTo));
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<PanelState>({
    status: "idle",
    message:
      "Run project-scoped evidence sync before intelligence interpretation and export.",
  });

  const rangeLabel = useMemo(() => {
    if (!from || !to) return "Select a valid date range";
    return `${from} → ${to}`;
  }, [from, to]);

  async function handleRun() {
    if (!projectSlug) {
      setState({
        status: "error",
        message: "Project slug is required for entity sync.",
      });
      return;
    }

    if (!from || !to) {
      setState({
        status: "error",
        message: "Both from and to dates are required.",
      });
      return;
    }

    try {
      setLoading(true);
      setState({
        status: "idle",
        message: "Running normalized sync for the active project...",
      });

      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          project: projectSlug,
          from,
          to,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Sync failed.");
      }

      const providerSummary = Array.isArray(payload?.results)
        ? payload.results
            .map((item: any) =>
              `${item.provider}: ${item.status}${typeof item.rowsSynced === "number" ? ` (${item.rowsSynced})` : ""}`
            )
            .join(" · ")
        : "Sync completed.";

      setState({
        status: "success",
        message: providerSummary,
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,32,75,0.62),rgba(4,10,24,0.88))] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[34px] font-semibold text-white">Entity sync control</h3>
          <p className="mt-2 max-w-[880px] text-[15px] text-white/72">
            Run project-scoped evidence sync before intelligence interpretation and export.
          </p>
        </div>
        <div className="rounded-full border border-white/10 px-5 py-3 text-[15px] text-white/72">
          {projectLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-3">
          <span className="text-[12px] uppercase tracking-[0.32em] text-white/46">From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-16 rounded-[20px] border border-white/12 bg-white/6 px-6 text-[18px] text-white outline-none"
          />
        </label>

        <label className="flex flex-col gap-3">
          <span className="text-[12px] uppercase tracking-[0.32em] text-white/46">To</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-16 rounded-[20px] border border-white/12 bg-white/6 px-6 text-[18px] text-white outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="h-16 rounded-[20px] border border-cyan-400/40 bg-cyan-400/10 px-8 text-[16px] font-semibold text-cyan-100 disabled:opacity-60"
          >
            {loading ? "Running sync..." : "Run entity sync"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Project</div>
          <div className="mt-3 text-[20px] font-semibold text-white">{projectLabel}</div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Project ID</div>
          <div className="mt-3 text-[20px] font-semibold text-white">{projectSlug}</div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.32em] text-white/46">Range</div>
          <div className="mt-3 text-[20px] font-semibold text-white">{rangeLabel}</div>
        </div>
      </div>

      <div
        className={`mt-6 rounded-[22px] border px-6 py-5 text-[15px] ${
          state.status === "error"
            ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
            : state.status === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-white/10 bg-black/10 text-white/72"
        }`}
      >
        {state.message}
      </div>
    </section>
  );
}