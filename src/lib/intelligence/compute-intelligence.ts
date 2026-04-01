import type {
  DiagnosticsSection,
  ProjectDiagnostics,
  ProjectEvidence,
} from "@/lib/evidence/types";
import { EMPTY_DIAGNOSTICS } from "@/lib/evidence/types";
import {
  findingsForCategory,
  rankProjectHypotheses,
  type RankedHypothesis,
} from "@/lib/intelligence/hypothesis-engine";

function buildSectionFromHypotheses(
  title: string,
  hypotheses: RankedHypothesis[],
  fallbackSummary: string,
  fallbackActions: string[]
): DiagnosticsSection {
  const top = hypotheses[0];

  if (!top) {
    return {
      title,
      summary: fallbackSummary,
      confidence: "low",
      actions: fallbackActions,
    };
  }

  return {
    title,
    summary: top.summary,
    confidence: top.confidence,
    actions: top.nextSteps,
  };
}

export function computeProjectDiagnostics(
  evidence: ProjectEvidence
): ProjectDiagnostics {
  const ranked = rankProjectHypotheses(evidence);

  if (ranked.length === 0) {
    return {
      ...EMPTY_DIAGNOSTICS,
      overview: {
        title: "Overview",
        summary:
          "Synced evidence is present, but the current rule set does not yet have enough confirming signals to rank a strong overall hypothesis.",
        confidence: "low",
        actions: [
          "Review entity-level SEO and Behavior tables for stronger evidence concentration.",
          "Allow more historical sync depth so repeated patterns become easier to rank.",
        ],
      },
      seo: {
        title: "SEO",
        summary:
          evidence.gscQueryRows.length > 0 || evidence.gscPageRows.length > 0
            ? "SEO evidence is present, but the current signal set does not yet point to a dominant SEO hypothesis."
            : "SEO entity evidence is still too thin to support a ranked search hypothesis.",
        confidence: "low",
        actions: [
          "Review top queries and top pages for stronger impression, CTR, and ranking patterns.",
          "Deepen search evidence so stronger confirming signals can be ranked.",
        ],
      },
      behavior: {
        title: "Behavior",
        summary:
          evidence.ga4LandingRows.length > 0 || evidence.ga4SourceRows.length > 0
            ? "Behavior evidence is present, but the current signal set does not yet point to a dominant behavior hypothesis."
            : "Behavior entity evidence is still too thin to support a ranked on-site hypothesis.",
        confidence: "low",
        actions: [
          "Review landing-page and source / medium rows for stronger quality or conversion gaps.",
          "Deepen behavior evidence so stronger confirming signals can be ranked.",
        ],
      },
      crossSource: {
        title: "Cross-source",
        summary:
          evidence.gscPageRows.length > 0 && evidence.ga4LandingRows.length > 0
            ? "Cross-source evidence exists, but no dominant mismatch or alignment pattern has yet outranked the others."
            : "Cross-source comparison remains limited until both search and behavior entity layers are stronger.",
        confidence: "low",
        actions: [
          "Compare top search pages with top landing pages.",
          "Look for pages where demand capture and on-site quality diverge.",
        ],
      },
      seoFindings: [],
      behaviorFindings: [],
      crossSourceFindings: [],
    };
  }

  const overviewHypotheses = ranked.filter((item) => item.category === "overview");
  const seoHypotheses = ranked.filter((item) => item.category === "seo");
  const behaviorHypotheses = ranked.filter(
    (item) => item.category === "behavior"
  );
  const crossSourceHypotheses = ranked.filter(
    (item) => item.category === "crossSource"
  );

  return {
    overview: buildSectionFromHypotheses(
      "Overview",
      overviewHypotheses.length > 0 ? overviewHypotheses : ranked.slice(0, 1),
      "Top-level project evidence is available, but the current rule set does not yet rank a dominant overall reading.",
      [
        "Inspect the strongest SEO and Behavior findings to determine the current business constraint.",
        "Use entity-level tables to confirm which specific pages, queries, or sources need action.",
      ]
    ),
    seo: buildSectionFromHypotheses(
      "SEO",
      seoHypotheses,
      "SEO evidence is available, but no single search-performance hypothesis currently outranks the rest.",
      [
        "Inspect query-level and page-level evidence for stronger CTR or position gaps.",
        "Prioritize the most visible pages where search demand is already established.",
      ]
    ),
    behavior: buildSectionFromHypotheses(
      "Behavior",
      behaviorHypotheses,
      "Behavior evidence is available, but no single landing-page or channel-quality hypothesis currently outranks the rest.",
      [
        "Inspect landing-page and source / medium evidence for stronger quality gaps.",
        "Focus on pages and channels contributing traffic without proportional outcomes.",
      ]
    ),
    crossSource: buildSectionFromHypotheses(
      "Cross-source",
      crossSourceHypotheses,
      "Cross-source evidence exists, but the current rule set does not yet rank a dominant alignment or mismatch pattern.",
      [
        "Compare top search pages against top landing pages.",
        "Inspect whether acquisition quality supports the demand being captured.",
      ]
    ),
    seoFindings: findingsForCategory(evidence, "seo"),
    behaviorFindings: findingsForCategory(evidence, "behavior"),
    crossSourceFindings: findingsForCategory(evidence, "crossSource"),
  };
}