"use client";

import { useMemo, useState } from "react";

export type EntitySyncPanelProps = {
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
  dateRange: {
    from?: string;
    to?: string;
    preset?: string;
  };
};

type PanelState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
};

function normalizeDateInput(value?: string): string {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
    message: hasProject
      ? `Ready to sync ${projectLabel}.`
      : "Resolve a project to enable sync.",
  });

  const canRun = useMemo(() => {
    return (
      hasProject &&
      Boolean(projectId) &&
      isIsoDate(from) &&
      isIsoDate(to) &&
      state.status !== "running"
    );
  }, [hasProject, projectId, from, to, state.status]);

  async function handleRun() {
    if (!hasProject || !projectId) {
      setState({
        status: "error",
        message: "PROJECT_SELECTION_REQUIRED",
      });
      return;
    }

    if (!isIsoDate(from) || !isIsoDate(to)) {
      setState({
        status: "error",
        message: "VALID_DATE_RANGE_REQUIRED",
      });
      return;
    }

    setState({
      status: "running",
      message: `Entity sync is running for ${projectLabel}...`,
    });

    try {
      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          dateRange: {
            start: from,
            end: to,
            preset: dateRange.preset,
          },
          mode: "manual",
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        note?: string;
        ranAt?: string;
        projectId?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "ENTITY_SYNC_FAILED");
      }

      setState({
        status: "success",
        message:
          payload.note ??
          `Entity sync completed for ${projectLabel}${
            payload.ranAt ? ` at ${payload.ranAt}` : "."
          }`,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "ENTITY_SYNC_FAILED",
      });
    }
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Entity sync control</h2>
          <p className="mt-2 text-sm leading-6 text-white/56">
            Run project-scoped evidence sync before intelligence interpretation and
            export.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/65">
          {hasProject ? projectLabel : "No project selected"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
            From
          </div>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(normalizeDateInput(event.target.value))}
            className="w-full rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
          />
        </label>

        <label className="block">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
            To
          </div>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(normalizeDateInput(event.target.value))}
            className="w-full rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
          />
        </label>

        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] px-4 py-3 text-sm font-medium text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.status === "running" ? "Running..." : "Run entity sync"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Project
          </div>
          <div className="mt-2 text-sm text-white/72">
            {hasProject ? projectLabel : "No project selected"}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Project ID
          </div>
          <div className="mt-2 text-sm text-white/72">
            {hasProject ? projectId : "Unavailable"}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Range
          </div>
          <div className="mt-2 text-sm text-white/72">
            {from && to ? `${from} → ${to}` : "Valid date range required"}
          </div>
        </div>
      </div>

      <div
        className={`mt-4 rounded-[16px] border px-4 py-4 text-sm ${
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