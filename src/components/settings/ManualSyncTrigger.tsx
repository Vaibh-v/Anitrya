"use client";

import { useMemo, useState } from "react";
import type { SyncSourceKey } from "@/lib/sync/sync-orchestrator-contracts";

type Props = {
  workspaceId: string | null;
  projectSlug: string | null;
  from: string;
  to: string;
};

type TriggerState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
};

const DEFAULT_SOURCES: SyncSourceKey[] = ["google_ga4", "google_gsc"];

export function ManualSyncTrigger({
  workspaceId,
  projectSlug,
  from,
  to,
}: Props) {
  const [state, setState] = useState<TriggerState>({
    status: "idle",
    message: "Manual sync is ready.",
  });

  const disabled = useMemo(
    () =>
      !workspaceId ||
      !projectSlug ||
      from.trim().length === 0 ||
      to.trim().length === 0 ||
      state.status === "running",
    [workspaceId, projectSlug, from, to, state.status]
  );

  async function handleRun(): Promise<void> {
    if (!workspaceId || !projectSlug) {
      setState({
        status: "error",
        message: "Missing workspace or project selection.",
      });
      return;
    }

    setState({
      status: "running",
      message: "Sync is running...",
    });

    try {
      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          projectSlug,
          from,
          to,
          sources: DEFAULT_SOURCES,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        summary?: {
          state: string;
          totalRowsProcessed: number;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Sync request failed.");
      }

      setState({
        status: "success",
        message: `Sync completed with ${payload.summary?.totalRowsProcessed ?? 0} processed rows.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected sync failure.";

      setState({
        status: "error",
        message,
      });
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRun}
        disabled={disabled}
        className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] px-4 py-2 text-sm font-medium text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.status === "running" ? "Running sync..." : "Run manual sync"}
      </button>

      <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/65">
        {state.message}
      </div>
    </div>
  );
}