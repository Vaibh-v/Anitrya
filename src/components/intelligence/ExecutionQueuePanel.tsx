"use client";

import { useEffect, useState } from "react";
import { ExecutionStatusBadge } from "@/components/intelligence/ExecutionStatusBadge";
import { ExecutionStatusToggle } from "@/components/intelligence/ExecutionStatusToggle";
import { OutcomeBadge } from "@/components/intelligence/OutcomeBadge";
import { OutcomeSelector } from "@/components/intelligence/OutcomeSelector";

type QueueItem = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  blockedBy: string[];
  recommendedOwner: "seo" | "marketing" | "ops" | "dev";
  status?: "pending" | "in_progress" | "blocked" | "completed";
};

type QueueResponse = {
  ok?: boolean;
  error?: string;
  queue?: {
    projectId: string;
    items: QueueItem[];
  };
};

type ExecutionStateResponse = {
  ok?: boolean;
  error?: string;
  records?: Array<{
    id: string;
    projectId: string;
    actionTitle: string;
    status: "pending" | "in_progress" | "blocked" | "completed";
    updatedAt: number;
  }>;
};

type OutcomeResponse = {
  ok?: boolean;
  outcomes?: Array<{
    id: string;
    workspaceId: string;
    projectSlug: string;
    hypothesisTitle: string;
    recommendationTitle: string;
    outcomeStatus: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
    outcomeNote: string;
    impactDelta: number;
    createdAt: string;
  }>;
};

type LearningByAction = {
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
};

export function ExecutionQueuePanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [outcomeMap, setOutcomeMap] = useState<
    Map<
      string,
      {
        outcomeStatus: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
        outcomeNote: string;
        impactDelta: number;
      }
    >
  >(new Map());
  const [learningMap, setLearningMap] = useState<Map<string, LearningByAction>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const queueResponse = await fetch(
          `/api/intelligence/execution-queue?project=${encodeURIComponent(projectId)}`
        );
        const queuePayload = (await queueResponse.json()) as QueueResponse;

        if (cancelled) return;

        if (!queuePayload.ok || !queuePayload.queue) {
          setError(queuePayload.error ?? "Failed to load execution queue.");
          return;
        }

        const baseItems = queuePayload.queue.items.map((item) => ({
          ...item,
          status: item.status ?? "pending",
        }));

        setItems(baseItems);

        const stateResponse = await fetch(
          `/api/intelligence/execution-state?project=${encodeURIComponent(projectId)}`
        );
        const statePayload = (await stateResponse.json()) as ExecutionStateResponse;

        if (!cancelled && statePayload.ok) {
          const stateMap = new Map(
            (statePayload.records ?? []).map((record) => [
              record.actionTitle,
              record.status,
            ])
          );

          setItems(
            baseItems.map((item) => ({
              ...item,
              status: stateMap.get(item.title) ?? item.status ?? "pending",
            }))
          );
        }

        const outcomesResponse = await fetch(
          `/api/intelligence/outcome?project=${encodeURIComponent(projectId)}`
        );
        const outcomesPayload = (await outcomesResponse.json()) as OutcomeResponse;

        if (!cancelled && outcomesPayload.ok) {
          const latestOutcomeMap = new Map<
            string,
            {
              outcomeStatus: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
              outcomeNote: string;
              impactDelta: number;
            }
          >();

          const grouped = new Map<
            string,
            { success: number; failure: number; totalImpact: number; sampleSize: number }
          >();

          for (const outcome of outcomesPayload.outcomes ?? []) {
            latestOutcomeMap.set(outcome.recommendationTitle, {
              outcomeStatus: outcome.outcomeStatus,
              outcomeNote: outcome.outcomeNote,
              impactDelta: outcome.impactDelta,
            });

            const current =
              grouped.get(outcome.recommendationTitle) ?? {
                success: 0,
                failure: 0,
                totalImpact: 0,
                sampleSize: 0,
              };

            if (
              outcome.outcomeStatus === "implemented" ||
              outcome.outcomeStatus === "improved"
            ) {
              current.success += 1;
            }

            if (outcome.outcomeStatus === "rejected") {
              current.failure += 1;
            }

            current.totalImpact += outcome.impactDelta ?? 0;
            current.sampleSize += 1;

            grouped.set(outcome.recommendationTitle, current);
          }

          const learning = new Map<string, LearningByAction>();
          for (const [title, current] of grouped.entries()) {
            learning.set(title, {
              successRate:
                current.sampleSize > 0 ? current.success / current.sampleSize : 0,
              failureRate:
                current.sampleSize > 0 ? current.failure / current.sampleSize : 0,
              avgImpact:
                current.sampleSize > 0 ? current.totalImpact / current.sampleSize : 0,
              sampleSize: current.sampleSize,
            });
          }

          setOutcomeMap(latestOutcomeMap);
          setLearningMap(learning);
        }
      } catch (reason: unknown) {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load execution queue."
        );
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">Execution queue</div>
      <div className="mt-2 text-sm text-white/60">
        Ordered work the team should execute next to improve intelligence quality and readiness.
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const savedOutcome = outcomeMap.get(item.title);
          const learning = learningMap.get(item.title);

          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-black/16 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/60">{item.reason}</div>
                  {learning ? (
                    <div className="mt-2 text-xs text-white/45">
                      Historical success: {Math.round(learning.successRate * 100)}% •
                      Avg impact: {learning.avgImpact.toFixed(1)} •
                      Sample: {learning.sampleSize}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-white/45">
                      No historical outcome signal recorded yet.
                    </div>
                  )}
                </div>

                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                  {item.priority}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-white/60">
                  Owner: {item.recommendedOwner}
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-white/60">
                  {item.blockedBy.length > 0
                    ? `Blocked by: ${item.blockedBy.join(", ")}`
                    : "No blocking dependencies recorded."}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <ExecutionStatusBadge status={item.status ?? "pending"} />

                <ExecutionStatusToggle
                  projectId={projectId}
                  actionTitle={item.title}
                  initialStatus={item.status ?? "pending"}
                />
              </div>

              <div className="mt-4">
                {savedOutcome ? (
                  <div className="mb-3 flex items-center gap-3">
                    <OutcomeBadge outcome={savedOutcome.outcomeStatus} />
                    <div className="text-xs text-white/50">
                      Impact Δ: {savedOutcome.impactDelta}
                    </div>
                    {savedOutcome.outcomeNote ? (
                      <div className="text-xs text-white/50">
                        Note: {savedOutcome.outcomeNote}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <OutcomeSelector
                  projectSlug={projectId}
                  hypothesisTitle={item.title}
                  recommendationTitle={item.title}
                  initialOutcome={savedOutcome?.outcomeStatus}
                  initialImpactDelta={savedOutcome?.impactDelta}
                  initialOutcomeNote={savedOutcome?.outcomeNote}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}