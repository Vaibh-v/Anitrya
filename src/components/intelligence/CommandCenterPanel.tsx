"use client";

import { useEffect, useState } from "react";
import { BlockerListPanel } from "@/components/intelligence/BlockerListPanel";
import { OwnerLoadPanel } from "@/components/intelligence/OwnerLoadPanel";

type CommandCenterResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    projectId: string;
    headline: string;
    summary: string;
    priority: "high" | "medium" | "low";
    overallScore: number;
    strongestCategory: string;
    weakestCategory: string;
    blockers: Array<{
      label: string;
      reason: string;
    }>;
    ownerLoad: Array<{
      owner: "seo" | "marketing" | "ops" | "dev";
      count: number;
    }>;
    firstActions: string[];
  };
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

type HypothesisResponse = {
  ok?: boolean;
  hypotheses?: Array<{
    id: string;
    title: string;
    category: string;
    confidence: "low" | "medium" | "high";
    rank: number;
    summary: string;
    evidence: string[];
    blockers: string[];
    actions: string[];
  }>;
};

export function CommandCenterPanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<CommandCenterResponse["payload"] | null>(null);
  const [error, setError] = useState("");
  const [learningLine, setLearningLine] = useState("");
  const [topHypothesis, setTopHypothesis] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [commandRes, outcomeRes, hypothesisRes] = await Promise.all([
          fetch(`/api/intelligence/command-center?project=${encodeURIComponent(projectId)}`),
          fetch(`/api/intelligence/outcome?project=${encodeURIComponent(projectId)}`),
          fetch(`/api/intelligence/hypotheses?project=${encodeURIComponent(projectId)}`),
        ]);

        const commandData = (await commandRes.json()) as CommandCenterResponse;
        const outcomeData = (await outcomeRes.json()) as OutcomeResponse;
        const hypothesisData = (await hypothesisRes.json()) as HypothesisResponse;

        if (cancelled) return;

        if (!commandData.ok || !commandData.payload) {
          setError(commandData.error ?? "Failed to load command center.");
          return;
        }

        setPayload(commandData.payload);

        const outcomes = outcomeData.outcomes ?? [];
        if (outcomes.length > 0) {
          let success = 0;
          let totalImpact = 0;

          for (const item of outcomes) {
            if (
              item.outcomeStatus === "implemented" ||
              item.outcomeStatus === "improved"
            ) {
              success += 1;
            }
            totalImpact += typeof item.impactDelta === "number" ? item.impactDelta : 0;
          }

          const successRate = Math.round((success / outcomes.length) * 100);
          const avgImpact = totalImpact / outcomes.length;

          setLearningLine(
            `Based on ${outcomes.length} tracked outcomes • success rate ${successRate}% • avg impact ${avgImpact.toFixed(1)}`
          );
        } else {
          setLearningLine("No tracked outcomes yet — confidence is still based mostly on evidence coverage.");
        }

        const top = hypothesisData.hypotheses?.[0];
        if (top) {
          setTopHypothesis(`${top.title} • ${top.confidence} confidence`);
        } else {
          setTopHypothesis("No ranked hypothesis is available yet.");
        }
      } catch (reason: unknown) {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load command center."
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

  if (!payload) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        Loading command center...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">{payload.headline}</div>
            <div className="mt-2 text-sm leading-6 text-white/65">
              {payload.summary}
            </div>
            <div className="mt-2 text-xs text-white/45">{learningLine}</div>
            <div className="mt-2 text-xs text-cyan-200/70">
              Top hypothesis: {topHypothesis}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
              Overall
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {payload.overallScore}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Priority
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {payload.priority}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Strongest
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {payload.strongestCategory}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Weakest
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {payload.weakestCategory}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            First actions
          </div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/60">
            {payload.firstActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ol>
        </div>

        <BlockerListPanel blockers={payload.blockers} />
        <OwnerLoadPanel ownerLoad={payload.ownerLoad} />
      </div>
    </div>
  );
}