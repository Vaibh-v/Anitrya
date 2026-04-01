import { buildIntelligenceSummary } from "@/lib/intelligence/intelligence-summary";
import { getOutcomeLearningSummary } from "@/lib/intelligence/outcome-learning";

export type CrossSourceHypothesis = {
  id: string;
  title: string;
  category: "coverage" | "cross_source" | "execution";
  confidence: "low" | "medium" | "high";
  rank: number;
  summary: string;
  evidence: string[];
  blockers: string[];
  actions: string[];
};

function confidenceFromRank(rank: number): "low" | "medium" | "high" {
  if (rank >= 75) return "high";
  if (rank >= 45) return "medium";
  return "low";
}

export async function buildCrossSourceHypotheses(input: {
  workspaceId: string;
  projectId: string;
}): Promise<CrossSourceHypothesis[]> {
  const [summary, learning] = await Promise.all([
    buildIntelligenceSummary(input.projectId),
    getOutcomeLearningSummary({
      workspaceId: input.workspaceId,
      projectSlug: input.projectId,
    }),
  ]);

  const evidence = summary.evidence.map(
    (item) => `${item.source} · ${item.metric}: ${String(item.value)}`
  );

  const blockers = summary.missingData.map(
    (item) => `${item.source}: ${item.reason}`
  );

  const hypotheses: CrossSourceHypothesis[] = [];

  hypotheses.push({
    id: "coverage-constrained-intelligence",
    title: "Coverage-constrained intelligence read",
    category: "coverage",
    rank: summary.missingData.length > 0 ? 82 : 42,
    confidence: confidenceFromRank(summary.missingData.length > 0 ? 82 : 42),
    summary:
      summary.missingData.length > 0
        ? "The strongest current explanation is that interpretation quality is still constrained by incomplete evidence coverage."
        : "Evidence coverage is no longer the main blocker, so interpretation can deepen.",
    evidence:
      evidence.length > 0
        ? evidence.slice(0, 3)
        : ["Project context is resolved but evidence depth remains low."],
    blockers,
    actions: [
      "Close the highest-friction missing evidence gaps first.",
      "Run sync after reconnecting required sources.",
      "Re-check cross-source reasoning once evidence density increases.",
    ],
  });

  hypotheses.push({
    id: "execution-learning-readiness",
    title: "Execution learning readiness",
    category: "execution",
    rank: learning.sampleSize >= 3 ? 68 : 34,
    confidence: confidenceFromRank(learning.sampleSize >= 3 ? 68 : 34),
    summary:
      learning.sampleSize >= 3
        ? `The system has enough tracked outcomes to begin adjusting confidence using real execution history (${learning.sampleSize} outcomes).`
        : "Outcome history is still too thin to materially shift confidence, so execution learning remains early.",
    evidence: [
      `Tracked outcomes: ${learning.sampleSize}`,
      `Success rate: ${Math.round(learning.successRate * 100)}%`,
      `Average impact: ${learning.avgImpact.toFixed(1)}`,
    ],
    blockers:
      learning.sampleSize >= 3
        ? []
        : ["Not enough completed outcome records exist yet."],
    actions: [
      "Record outcomes after execution instead of leaving actions unclosed.",
      "Use impact delta consistently when an action changes performance.",
    ],
  });

  hypotheses.push({
    id: "cross-source-reasoning-not-yet-sharp",
    title: "Cross-source contradiction detection is not yet sharp",
    category: "cross_source",
    rank: summary.missingData.length >= 2 ? 61 : 47,
    confidence: confidenceFromRank(summary.missingData.length >= 2 ? 61 : 47),
    summary:
      summary.missingData.length >= 2
        ? "Cross-source contradictions cannot yet be ranked confidently because multiple source layers remain incomplete."
        : "Cross-source contradiction detection can begin, but confidence is still moderate until deeper evidence is hydrated.",
    evidence:
      summary.missingData.length >= 2
        ? blockers.slice(0, 3)
        : evidence.slice(0, 3),
    blockers,
    actions: [
      "Hydrate GA4, GSC, and behavior evidence into the same reasoning layer.",
      "Promote contradiction detection only after source coverage improves.",
    ],
  });

  return hypotheses.sort((a, b) => b.rank - a.rank);
}