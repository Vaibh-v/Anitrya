"use client";

import { useEffect, useMemo, useState } from "react";

type PanelState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
};

export type EntitySyncPanelProps = {
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
  dateRange: {
    from: string;
    to: string;
    preset?: string;
  };
};

function normalizeDateInput(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

export function EntitySyncPanel({
  projectId,
  projectLabel,
  hasProject,
  dateRange,
}: EntitySyncPanelProps) {
  const [from, setFrom] = useState(normalizeDateInput(dateRange.from));
  const [to, setTo] = useState(normalizeDateInput(dateRange.to));
  const [state, setState] = useState<PanelState>({
    status: "idle",
    message:
      "Run project-scoped evidence sync before intelligence interpretation and export.",
  });

  useEffect(() => {
    if (dateRange?.from) {
      setFrom(normalizeDateInput(dateRange.from));
    }
    if (dateRange?.to) {
      setTo(normalizeDateInput(dateRange.to));
    }
  }, [dateRange]);

  const canRun = useMemo(() => {
    return Boolean(hasProject && projectId && from && to) && state.status !== "running";
  }, [hasProject, projectId, from, to, state.status]);

  async function handleRun() {
    if (!hasProject || !projectId) {
      setState({
        status: "error",
        message: "Project slug is required for entity sync.",
      });
      return;
    }

    setState({
      status: "running",
      message: "Running entity sync...",
    });

    try {
      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectSlug: projectId,
          projectId,
          from,
          to,
          sources: ["google_ga4", "google_gsc"],
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Entity sync failed.");
      }

      setState({
        status: "success",
        message:
          payload?.run?.message ??
          "Sync completed. Data ingestion layer executed. Evidence will hydrate once normalized.",
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Entity sync failed.",
      });
    }
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-white">Entity sync control</div>
          <div className="mt-2 text-sm leading-6 text-white/60">
            Run project-scoped evidence sync before intelligence interpretation and export.
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65">
          {projectLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
            From
          </div>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
            To
          </div>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className="w-full rounded-[16px] border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
          >
            {state.status === "running" ? "Running..." : "Run entity sync"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Project
          </div>
          <div className="mt-2 text-lg font-semibold text-white">{projectLabel}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Project id
          </div>
          <div className="mt-2 text-lg font-semibold text-white">{projectId}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Range
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {from} → {to}
          </div>
        </div>
      </div>

      <div
        className={`mt-5 rounded-[16px] border px-4 py-4 text-sm ${
          state.status === "error"
            ? "border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
            : state.status === "success"
            ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
            : "border-white/10 bg-black/16 text-white/65"
        }`}
      >
        {state.message}
      </div>
    </section>
  );
}