import type { IntegrationToggleRecord } from "@/components/settings/IntegrationTogglePanel";

export async function buildIntegrationToggleSeed(input: {
  workspaceId: string | null;
}) {
  const hasWorkspace = Boolean(input.workspaceId);

  const records: IntegrationToggleRecord[] = [
    {
      providerKey: "google_ga4",
      title: "Google Analytics 4",
      description:
        "Primary traffic, landing quality, and source-quality evidence layer for Overview, Behavior, and Intelligence.",
      state: hasWorkspace ? "active" : "blocked",
      enabled: hasWorkspace,
      disabledReason: hasWorkspace
        ? undefined
        : "Workspace is missing, so GA4 cannot be activated safely.",
    },
    {
      providerKey: "google_gsc",
      title: "Google Search Console",
      description:
        "Primary demand capture and page visibility evidence layer for SEO and Intelligence.",
      state: hasWorkspace ? "active" : "blocked",
      enabled: hasWorkspace,
      disabledReason: hasWorkspace
        ? undefined
        : "Workspace is missing, so GSC cannot be activated safely.",
    },
    {
      providerKey: "google_gbp",
      title: "Google Business Profile",
      description:
        "Local-intent and store-level visibility layer. Ready to preserve now and activate once normalized ingestion is wired.",
      state: hasWorkspace ? "active" : "blocked",
      enabled: false,
      disabledReason: hasWorkspace
        ? undefined
        : "Workspace is missing, so GBP cannot be activated safely.",
    },
    {
      providerKey: "google_ads",
      title: "Google Ads",
      description:
        "Paid acquisition layer for spend, clicks, and downstream conversion support.",
      state: hasWorkspace ? "active" : "blocked",
      enabled: false,
      disabledReason: hasWorkspace
        ? undefined
        : "Workspace is missing, so Google Ads cannot be activated safely.",
    },
    {
      providerKey: "google_trends",
      title: "Google Trends",
      description:
        "Market context layer for demand movement and external search interest.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "Preserved in architecture. Activation should happen only after its normalized evidence ingestion route exists.",
    },
    {
      providerKey: "google_sheets",
      title: "Google Sheets storage",
      description:
        "Append-only storage surface for synced evidence, recommendations, and sync health.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "Storage layer is governed by OAuth scope and export orchestration, not a manual toggle.",
    },
    {
      providerKey: "openai_chatgpt",
      title: "ChatGPT",
      description:
        "Future reasoning provider. Must stay evidence-only and cannot be manually activated ahead of routing controls.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "AI providers remain preserved until evidence-backed routing and provenance are fully enforced.",
    },
    {
      providerKey: "google_gemini",
      title: "Gemini",
      description:
        "Future reasoning provider. Preserved for orchestration once evidence-backed routing is implemented.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "AI providers remain preserved until evidence-backed routing and provenance are fully enforced.",
    },
    {
      providerKey: "anthropic_claude",
      title: "Claude",
      description:
        "Future reasoning provider. Preserved for orchestration once evidence-backed routing is implemented.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "AI providers remain preserved until evidence-backed routing and provenance are fully enforced.",
    },
    {
      providerKey: "semrush",
      title: "SEMrush",
      description:
        "Future competitive SEO and ranking layer for SEO and market context.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "Preserved in architecture. Activate only after normalized SEMrush ingestion is implemented.",
    },
    {
      providerKey: "linkwhisper",
      title: "LinkWhisper",
      description:
        "Future internal-link and content-structure layer for SEO interpretation.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "Preserved in architecture. Activation requires a compliant ingestion path.",
    },
    {
      providerKey: "birdeye",
      title: "Birdeye",
      description:
        "Future reputation and review intelligence layer.",
      state: "preserved",
      enabled: false,
      disabledReason:
        "Preserved in architecture. Activation requires a compliant ingestion path.",
    },
  ];

  return records;
}