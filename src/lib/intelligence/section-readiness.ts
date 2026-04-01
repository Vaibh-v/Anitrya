export type ReadinessTone = "ready" | "partial" | "missing" | "neutral";

export type ReadinessCard = {
  label: string;
  value: string | number;
  context: string;
  tone: ReadinessTone;
};

export type ConnectedSourceItem = {
  label: string;
  status: string;
  tone: ReadinessTone;
  context: string;
  nextStep: string;
};

export function buildOverviewReadinessCards(): ReadinessCard[] {
  return [
    {
      label: "Core evidence",
      value: "thin",
      context: "GA4 and GSC normalized rows are still missing for stronger overview interpretation.",
      tone: "missing",
    },
    {
      label: "Cross-source",
      value: "constrained",
      context: "Cross-source synthesis remains limited until search and behavior evidence deepen together.",
      tone: "partial",
    },
    {
      label: "Learning",
      value: "active",
      context: "Execution and outcome tracking can already feed back into intelligence quality.",
      tone: "ready",
    },
    {
      label: "Next unlock",
      value: "GA4 + GSC sync",
      context: "Hydrated normalized evidence is the main requirement for stronger overview reads.",
      tone: "partial",
    },
  ];
}

export function buildSeoReadinessCards(): ReadinessCard[] {
  return [
    {
      label: "Query evidence",
      value: "missing",
      context: "Query-level normalized rows are not yet contributing to ranked SEO interpretation.",
      tone: "missing",
    },
    {
      label: "Page evidence",
      value: "missing",
      context: "Page-level normalized rows are still absent from the current SEO layer.",
      tone: "missing",
    },
    {
      label: "Ranking confidence",
      value: "low",
      context: "Confidence remains low because search-demand and page-evidence coverage are still thin.",
      tone: "partial",
    },
    {
      label: "Next unlock",
      value: "GSC normalization",
      context: "Query and page evidence must hydrate together before SEO reads can strengthen.",
      tone: "partial",
    },
  ];
}

export function buildBehaviorReadinessCards(): ReadinessCard[] {
  return [
    {
      label: "Landing evidence",
      value: "missing",
      context: "Landing-level behavioral rows are still absent from the current range.",
      tone: "missing",
    },
    {
      label: "Acquisition evidence",
      value: "missing",
      context: "Source and medium rows are still absent from the current behavior layer.",
      tone: "missing",
    },
    {
      label: "Interpretation confidence",
      value: "low",
      context: "Behavior ranking stays low until landing and source evidence confirm the same pattern.",
      tone: "partial",
    },
    {
      label: "Next unlock",
      value: "GA4 normalization",
      context: "Hydrated landing and acquisition-quality evidence is the next key unlock.",
      tone: "partial",
    },
  ];
}

export function buildIntelligenceReadinessCards(): ReadinessCard[] {
  return [
    {
      label: "Evidence depth",
      value: "constrained",
      context: "The intelligence layer is structurally complete but still limited by missing normalized rows.",
      tone: "partial",
    },
    {
      label: "Execution tracking",
      value: "active",
      context: "Execution status and outcomes are already captured for this project.",
      tone: "ready",
    },
    {
      label: "Learning loop",
      value: "active",
      context: "Outcome history is now visible and can influence ranking as sample depth increases.",
      tone: "ready",
    },
    {
      label: "Next unlock",
      value: "source hydration",
      context: "Real normalized GA4 and GSC evidence is the main unlock for stronger contradiction detection.",
      tone: "partial",
    },
  ];
}

export function buildOverviewConnectedSources(): ConnectedSourceItem[] {
  return [
    {
      label: "GA4 evidence",
      status: "missing",
      tone: "missing",
      context: "Traffic-source and landing-quality rows are not yet hydrated into overview interpretation.",
      nextStep: "Run sync after confirming GA4 project mapping.",
    },
    {
      label: "GSC evidence",
      status: "missing",
      tone: "missing",
      context: "Search-demand and page evidence are not yet contributing to overview interpretation.",
      nextStep: "Run sync after confirming Search Console mapping.",
    },
    {
      label: "Future context",
      status: "preserved",
      tone: "ready",
      context: "Google Business Profile, Ads, Trends, and competitor context remain preserved in architecture.",
      nextStep: "Unlock future evidence layers after core sources are stable.",
    },
  ];
}

export function buildSeoConnectedSources(): ConnectedSourceItem[] {
  return [
    {
      label: "Query layer",
      status: "missing",
      tone: "missing",
      context: "Search-demand rows are not yet available for ranked SEO interpretation.",
      nextStep: "Hydrate normalized query rows into the SEO layer.",
    },
    {
      label: "Page layer",
      status: "missing",
      tone: "missing",
      context: "Page-priority rows are not yet available for ranked SEO interpretation.",
      nextStep: "Hydrate normalized page rows into the SEO layer.",
    },
    {
      label: "Intelligence linkage",
      status: "active",
      tone: "ready",
      context: "SEO can already feed into the intelligence layer once normalized evidence appears.",
      nextStep: "Use intelligence reads after search evidence depth increases.",
    },
  ];
}

export function buildBehaviorConnectedSources(): ConnectedSourceItem[] {
  return [
    {
      label: "Landing layer",
      status: "missing",
      tone: "missing",
      context: "Page-level behavioral rows are not yet available for ranked behavior interpretation.",
      nextStep: "Hydrate normalized landing rows into the behavior layer.",
    },
    {
      label: "Source layer",
      status: "missing",
      tone: "missing",
      context: "Acquisition-quality rows are not yet available for ranked behavior interpretation.",
      nextStep: "Hydrate normalized source / medium rows into the behavior layer.",
    },
    {
      label: "Execution linkage",
      status: "active",
      tone: "ready",
      context: "Behavioral recommendations can already feed the intelligence execution loop.",
      nextStep: "Use behavior evidence to validate intent-to-performance alignment once rows are available.",
    },
  ];
}

export function buildIntelligenceConnectedSources(): ConnectedSourceItem[] {
  return [
    {
      label: "Command center",
      status: "active",
      tone: "ready",
      context: "Decision, execution, and learning layers are already visible and connected.",
      nextStep: "Keep recording outcomes so learning quality compounds.",
    },
    {
      label: "SEO + behavior evidence",
      status: "thin",
      tone: "partial",
      context: "Cross-source reasoning is structurally present but still constrained by missing normalized evidence.",
      nextStep: "Hydrate search and behavior evidence into the same reasoning spine.",
    },
    {
      label: "Project activity",
      status: "active",
      tone: "ready",
      context: "Execution updates, outcomes, and learning momentum are already visible inside intelligence.",
      nextStep: "Use recent activity to refine ranking once sample size increases.",
    },
  ];
}