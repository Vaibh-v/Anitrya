"use client";

import { useMemo, useState } from "react";

type SyncResult = {
  provider: string;
  status: "success" | "error" | "skipped";
  rowsSynced?: number;
  reason?: string;
};

type SyncPayload = {
  ok?: boolean;
  error?: string;
  details?: string;
  summary?: string;
  results?: SyncResult[];
  ownerSheet?: {
    status?: "mirrored" | "skipped" | "error";
    reason?: string;
    summary?: string;
    label?: string;
    detail?: string;
    missingEnv?: string[];
    actionRequired?: string[];
    masterSpreadsheetId?: string;
    customerSpreadsheetId?: string;
  };
  intelligence?: {
    status?: "generated" | "error";
    insights?: number;
    recommendations?: number;
    exportStatus?: "mirrored" | "skipped" | "error";
    exportError?: string;
    customerSpreadsheetId?: string;
  };
};

export type EntitySyncPanelProps = {
  projectSlug: string;
  projectLabel: string;
  initialFrom: string;
  initialTo: string;
};

type PanelState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string; payload?: SyncPayload }
  | { status: "error"; message: string; payload?: SyncPayload };

function normalizeDateInput(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

function buildSummaryFromResults(results: SyncResult[]) {
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

      const rawText = await response.text();
      let payload: SyncPayload = {};

      if (rawText.trim()) {
        try {
          payload = JSON.parse(rawText) as SyncPayload;
        } catch {
          throw new Error(
            `Sync route returned non-JSON response (${response.status}): ${rawText.slice(0, 500)}`,
          );
        }
      }

      const results = payload.results ?? [];
      const message =
        payload.summary ||
        payload.error ||
        payload.details ||
        (results.length > 0 ? buildSummaryFromResults(results) : null) ||
        (response.ok ? "Sync completed." : "Sync failed.");

      if (!response.ok && response.status !== 207) {
        throw new Error(message);
      }

      setState({
        status:
          payload.error || results.some((result) => result.status === "error")
            ? "error"
            : "success",
        message,
        payload,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Sync failed.",
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
          <span className="text-[12px] uppercase tracking-[0.3em] text-white/48">
            From
          </span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-16 rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none"
          />
        </label>

        <label className="flex flex-col gap-3">
          <span className="text-[12px] uppercase tracking-[0.3em] text-white/48">
            To
          </span>
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
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
            Project
          </div>
          <div className="mt-4 text-[20px] font-semibold text-white">
            {projectLabel}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
            Project ID
          </div>
          <div className="mt-4 text-[20px] font-semibold text-white">
            {projectSlug}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-5">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
            Range
          </div>
          <div className="mt-4 text-[20px] font-semibold text-white">
            {rangeLabel}
          </div>
        </div>
      </div>

      <div
        className={`mt-6 rounded-[22px] border px-5 py-5 text-[16px] leading-8 whitespace-pre-wrap break-words ${
          state.status === "error"
            ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
            : state.status === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
              : "border-white/10 bg-white/4 text-white/72"
        }`}
      >
        {state.message}
      </div>

      {state.status !== "idle" && state.payload ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-black/10 px-5 py-5">
            <div className="text-[12px] uppercase tracking-[0.24em] text-white/48">
              Source sync
            </div>
            <div className="mt-4 space-y-3">
              {(state.payload.results ?? []).map((result) => (
                <div key={result.provider} className="text-[15px] leading-6 text-white/72">
                  <span className="font-semibold text-white/90">
                    {result.provider}
                  </span>
                  {": "}
                  {result.status}
                  {typeof result.rowsSynced === "number"
                    ? ` (${result.rowsSynced})`
                    : ""}
                  {result.reason ? ` - ${result.reason}` : ""}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/10 px-5 py-5">
            <div className="text-[12px] uppercase tracking-[0.24em] text-white/48">
              Owner export
            </div>
            <div className="mt-4 text-[17px] font-semibold text-white">
              {state.payload.ownerSheet?.label ??
                state.payload.ownerSheet?.status ??
                "Not reported"}
            </div>
            <div className="mt-3 text-[15px] leading-7 text-white/68">
              {state.payload.ownerSheet?.detail ??
                state.payload.ownerSheet?.reason ??
                "No owner export detail returned."}
            </div>
            {state.payload.ownerSheet?.missingEnv?.length ? (
              <div className="mt-4 text-[13px] leading-6 text-amber-100/90">
                Missing: {state.payload.ownerSheet.missingEnv.join(", ")}
              </div>
            ) : null}
            {state.payload.ownerSheet?.customerSpreadsheetId ? (
              <div className="mt-4 text-[13px] leading-6 text-emerald-100/90">
                Customer sheet: {state.payload.ownerSheet.customerSpreadsheetId}
              </div>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/10 px-5 py-5">
            <div className="text-[12px] uppercase tracking-[0.24em] text-white/48">
              Intelligence export
            </div>
            <div className="mt-4 text-[17px] font-semibold text-white">
              {state.payload.intelligence?.status === "generated"
                ? `${state.payload.intelligence.insights ?? 0} insight(s), ${
                    state.payload.intelligence.recommendations ?? 0
                  } recommendation(s)`
                : state.payload.intelligence?.status === "error"
                  ? "Generation failed"
                  : "Not reported"}
            </div>
            <div className="mt-3 text-[15px] leading-7 text-white/68">
              Export: {state.payload.intelligence?.exportStatus ?? "not run"}
              {state.payload.intelligence?.exportError
                ? ` - ${state.payload.intelligence.exportError}`
                : ""}
            </div>
          </div>

          {state.payload.ownerSheet?.actionRequired?.length ? (
            <div className="rounded-[22px] border border-amber-300/20 bg-amber-300/8 px-5 py-5 lg:col-span-3">
              <div className="text-[12px] uppercase tracking-[0.24em] text-amber-100/70">
                Owner export setup
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {state.payload.ownerSheet.actionRequired.map((action) => (
                  <div key={action} className="text-[15px] leading-7 text-amber-50/88">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
