"use client";

import { useMemo, useState } from "react";

type PanelState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type SyncResult = {
  provider: string;
  status: "success" | "error" | "skipped";
  rowsSynced?: number;
  reason?: string;
};

type SyncResponse = {
  ok?: boolean;
  error?: string;
  summary?: string;
  results?: SyncResult[];
  project?: {
    id?: string;
    slug?: string;
    label?: string;
  };
};

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

function buildResultsSummary(results: SyncResult[]) {
  if (!results.length) {
    return "Sync completed.";
  }

  return results
    .map((item) => {
      if (item.status === "success") {
        return `${item.provider}: success (${item.rowsSynced ?? 0})${
          item.reason ? ` - ${item.reason}` : ""
        }`;
      }

      if (item.status === "skipped") {
        return `${item.provider}: skipped${
          item.reason ? ` - ${item.reason}` : ""
        }`;
      }

      return `${item.provider}: ${item.reason ?? "error"}`;
    })
    .join(" · ");
}

function buildFallbackError(payload: SyncResponse) {
  if (payload.error && payload.error.trim().length > 0) {
    return payload.error;
  }

  if (payload.summary && payload.summary.trim().length > 0) {
    return payload.summary;
  }

  if (payload.results?.length) {
    return buildResultsSummary(payload.results);
  }

  return "Sync failed.";
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

      const payload = (await response.json().catch(() => ({}))) as SyncResponse;

      if (!response.ok && response.status !== 207) {
        setState({
          status: "error",
          message: buildFallbackError(payload),
        });
        return;
      }

      const results = payload.results ?? [];
      const failures = results.filter((item) => item.status === "error");

      const message =
        payload.summary && payload.summary.trim().length > 0
          ? payload.summary
          : buildResultsSummary(results);

      setState({
        status: failures.length > 0 || payload.ok === false ? "error" : "success",
        message,
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
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,79,0.88),rgba(5,15,39,0.94))] px-8 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-white">
            Entity sync control
          </h2>
          <p className="mt-3 text-[18px] leading-8 text-white/72">
            Run project-scoped evidence sync before intelligence interpretation and export.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/4 px-5 py-3 text-[16px] text-white/78">
          {projectLabel}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-3">
          <span className="text-[12px] uppercase tracking-[0.3em] text-white/48">From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-16 rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none"
          />
        </label>

        <label className="flex flex-col gap-3">
          <span className="text-[12px] uppercase tracking-[0.3em] text-white/48">To</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-16 rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="h-16 rounded-[18px] border border-cyan-300/30 bg-cyan-300/10 px-8 text-[18px] font-semibold text-cyan-100 disabled:opacity-60"
          >
            {loading ? "Running sync..." : "Run entity sync"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Project</div>
          <div className="mt-4 text-[20px] font-semibold text-white">{projectLabel}</div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Project ID</div>
          <div className="mt-4 text-[20px] font-semibold text-white">{projectSlug}</div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">Range</div>
          <div className="mt-4 text-[20px] font-semibold text-white">{rangeLabel}</div>
        </div>
      </div>

      <div
        className={`mt-6 rounded-[22px] border px-5 py-5 text-[16px] leading-8 ${
          state.status === "error"
            ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
            : state.status === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
              : "border-white/10 bg-white/4 text-white/72"
        }`}
      >
        {state.message}
      </div>
    </section>
  );
}