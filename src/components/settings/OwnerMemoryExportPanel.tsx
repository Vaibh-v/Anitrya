"use client";

import { useState } from "react";

type OwnerMemoryExportPanelProps = {
  projectId: string;
  projectName: string;
  defaultFrom: string;
  defaultTo: string;
};

type ExportState =
  | { status: "idle"; message: string | null }
  | { status: "running"; message: string | null }
  | { status: "success"; message: string | null }
  | { status: "error"; message: string | null };

function summarizeTextResponse(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Server returned an empty response.";
  return cleaned.length > 600 ? `${cleaned.slice(0, 600)}…` : cleaned;
}

export function OwnerMemoryExportPanel({
  projectId,
  projectName,
  defaultFrom,
  defaultTo,
}: OwnerMemoryExportPanelProps) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [state, setState] = useState<ExportState>({
    status: "idle",
    message: null,
  });

  async function runExport() {
    try {
      setState({
        status: "running",
        message: `Exporting owner memory for ${projectName}...`,
      });

      const response = await fetch("/api/intelligence/export-owner-memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          preset: "custom",
          from,
          to,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const rawText = await response.text();

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Owner export returned non-JSON response. HTTP ${response.status}. ${summarizeTextResponse(
            rawText
          )}`
        );
      }

      let payload: any;
      try {
        payload = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Owner export returned invalid JSON. HTTP ${response.status}. ${summarizeTextResponse(
            rawText
          )}`
        );
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Owner memory export failed.");
      }

      setState({
        status: "success",
        message:
          `Owner memory updated. Insights: ${payload.insightsWritten}. ` +
          `Recommendations: ${payload.recommendationsWritten}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Owner memory export failed.";

      setState({
        status: "error",
        message,
      });
    }
  }

  const toneClass =
    state.status === "success"
      ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100"
      : state.status === "error"
      ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-100"
      : state.status === "running"
      ? "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-100"
      : "border-white/10 bg-white/[0.02] text-white/62";

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,31,58,0.92),rgba(7,14,29,0.9))] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-wide text-white/88">
          Owner memory export
        </h2>
        <p className="mt-1 text-sm text-white/48">
          Export generated insights and recommendations into the internal Anitrya owner sheet
          so the long-term product memory corpus can compound across projects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.18em] text-white/42">
            From
          </span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-[16px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.18em] text-white/42">
            To
          </span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-[16px] border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none"
          />
        </label>

        <button
          type="button"
          onClick={runExport}
          disabled={state.status === "running"}
          className="self-end rounded-[16px] border border-cyan-400/30 bg-cyan-400/[0.08] px-4 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-400/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "running" ? "Exporting..." : "Export owner memory"}
        </button>
      </div>

      <div className={`mt-4 rounded-[18px] border p-4 text-sm ${toneClass}`}>
        <div className="font-medium text-white">{projectName}</div>
        <div className="mt-2 leading-6">
          {state.message ??
            "No owner-memory export has been triggered in this session yet."}
        </div>
      </div>
    </section>
  );
}