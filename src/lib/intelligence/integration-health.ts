export type IntegrationHealthTone = "ready" | "partial" | "missing" | "neutral";

export type IntegrationHealthItem = {
  label: string;
  status: string;
  tone: IntegrationHealthTone;
  context: string;
  nextStep: string;
};

export type IntegrationHealthStat = {
  label: string;
  value: string | number;
  context: string;
};

export function buildSettingsHealthStats() {
  const stats: IntegrationHealthStat[] = [
    {
      label: "Connected sources",
      value: 0,
      context: "Sources actively contributing normalized evidence right now.",
    },
    {
      label: "Mapped projects",
      value: 2,
      context: "Projects visible in the current workspace context.",
    },
    {
      label: "Ready sections",
      value: 4,
      context: "Core product surfaces already structured and navigable.",
    },
    {
      label: "Sync confidence",
      value: "partial",
      context: "The sync layer is wired, but evidence hydration is still incomplete.",
    },
  ];

  return stats;
}

export function buildSettingsIntegrationItems(): IntegrationHealthItem[] {
  return [
    {
      label: "GA4 mapping",
      status: "partial",
      tone: "partial",
      context:
        "Project context and GA4 destination relationships are visible, but normalized evidence is still thin.",
      nextStep:
        "Confirm the active project maps to the intended GA4 property before the next sync run.",
    },
    {
      label: "GSC mapping",
      status: "partial",
      tone: "partial",
      context:
        "Search Console site mapping is visible, but query and page evidence are not yet flowing into SEO ranking.",
      nextStep:
        "Confirm the active project maps to the intended Search Console property before the next sync run.",
    },
    {
      label: "Behavior evidence",
      status: "missing",
      tone: "missing",
      context:
        "Landing and acquisition-quality evidence is not yet materially available inside the behavior layer.",
      nextStep:
        "Hydrate normalized GA4 landing and source rows into the behavior section.",
    },
    {
      label: "Intelligence learning",
      status: "active",
      tone: "ready",
      context:
        "Execution tracking, outcomes, and learning memory are already active inside the intelligence surface.",
      nextStep:
        "Keep recording execution outcomes so the ranking layer gets stronger over time.",
    },
  ];
}

export function buildSettingsActionChecklist() {
  return [
    "Confirm each active project maps to one GA4 property and one GSC property.",
    "Reconnect any Google integration that is present but not returning hydrated evidence.",
    "Run sync after mapping is confirmed so evidence rows can populate Overview, SEO, and Behavior.",
    "Review Intelligence only after sync completes and normalized evidence becomes visible in the section tabs.",
  ];
}