import type { IntegrationCatalogItem } from "@/lib/integrations/integration-contracts";

export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  {
    key: "google_ga4",
    label: "Google Analytics 4",
    category: "analytics",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: [
      "discovery",
      "sync",
      "normalization",
      "reasoning_input",
      "entity_mapping",
      "export_support",
    ],
    description:
      "Core traffic, landing, and acquisition evidence source for behavior and overview interpretation.",
    settingsSummary:
      "Must resolve the active project to the correct GA4 property before sync.",
    evidenceRole:
      "Provides normalized landing-quality and acquisition-quality evidence.",
  },
  {
    key: "google_gsc",
    label: "Google Search Console",
    category: "search",
    lifecycle: "active",
    connectionMode: "oauth",
    capabilities: [
      "discovery",
      "sync",
      "normalization",
      "reasoning_input",
      "entity_mapping",
      "export_support",
    ],
    description:
      "Core search-demand and page-level visibility evidence source for SEO and overview interpretation.",
    settingsSummary:
      "Must resolve the active project to the correct GSC property before sync.",
    evidenceRole:
      "Provides normalized query and page evidence for SEO reasoning.",
  },
  {
    key: "google_ads",
    label: "Google Ads",
    category: "paid_media",
    lifecycle: "preserved",
    connectionMode: "oauth",
    capabilities: [
      "sync",
      "normalization",
      "reasoning_input",
      "competitive_context",
      "export_support",
    ],
    description:
      "Paid acquisition source for campaign quality, spend efficiency, and search-term alignment.",
    settingsSummary:
      "Preserved for the unified growth system and future paid-media interpretation.",
    evidenceRole:
      "Will provide spend-to-outcome and campaign-quality context.",
  },
  {
    key: "google_trends",
    label: "Google Trends",
    category: "search",
    lifecycle: "preserved",
    connectionMode: "manual_review",
    capabilities: [
      "sync",
      "reasoning_input",
      "competitive_context",
      "export_support",
    ],
    description:
      "Demand-layer context for category movement, seasonality, and market timing interpretation.",
    settingsSummary:
      "Preserved as market context that should enrich search and demand interpretation.",
    evidenceRole:
      "Will provide external demand movement and seasonality context.",
  },
  {
    key: "google_business_profile",
    label: "Google Business Profile",
    category: "local",
    lifecycle: "preserved",
    connectionMode: "oauth",
    capabilities: [
      "sync",
      "normalization",
      "reasoning_input",
      "entity_mapping",
      "export_support",
    ],
    description:
      "Local-intent layer for calls, directions, visibility, and store-level demand interpretation.",
    settingsSummary:
      "Preserved to unlock local intent reasoning once the source is connected.",
    evidenceRole:
      "Will provide local visibility and local-intent conversion context.",
  },
  {
    key: "openai_chatgpt",
    label: "ChatGPT",
    category: "ai",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    description:
      "AI interpretation layer for evidence-backed reasoning and future execution support.",
    settingsSummary:
      "Should only operate on synced normalized data and never invent evidence.",
    evidenceRole:
      "Supports analysis over normalized evidence, not raw source truth.",
  },
  {
    key: "anthropic_claude",
    label: "Claude",
    category: "ai",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    description:
      "Alternative AI reasoning layer for evidence-backed synthesis and comparative analysis.",
    settingsSummary:
      "Should remain constrained to synced normalized data and visible blockers.",
    evidenceRole:
      "Supports comparative analyst reasoning, not source replacement.",
  },
  {
    key: "google_gemini",
    label: "Gemini",
    category: "ai",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: ["reasoning_input", "execution_feedback", "export_support"],
    description:
      "Google-aligned AI reasoning layer for evidence-backed interpretation and workflow assistance.",
    settingsSummary:
      "Should remain subordinate to normalized evidence and visible data constraints.",
    evidenceRole:
      "Supports evidence-based reasoning over synced source data.",
  },
  {
    key: "semrush",
    label: "SEMrush",
    category: "seo",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: [
      "sync",
      "competitive_context",
      "reasoning_input",
      "export_support",
    ],
    description:
      "Competitive SEO and keyword context layer for rankings, SERP pressure, and market comparison.",
    settingsSummary:
      "Preserved for competitor-aware SEO and search-market interpretation.",
    evidenceRole:
      "Will provide comparative SEO and keyword market context.",
  },
  {
    key: "birdeye",
    label: "Birdeye",
    category: "local",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: [
      "sync",
      "reasoning_input",
      "entity_mapping",
      "export_support",
    ],
    description:
      "Review, reputation, and local customer feedback layer for local business interpretation.",
    settingsSummary:
      "Preserved for reputation-aware local-intent and customer-experience reasoning.",
    evidenceRole:
      "Will provide structured reputation and review context.",
  },
  {
    key: "linkwhisper",
    label: "LinkWhisper",
    category: "content",
    lifecycle: "preserved",
    connectionMode: "api_key",
    capabilities: [
      "sync",
      "content_context",
      "reasoning_input",
      "export_support",
    ],
    description:
      "Internal linking and content-structure context for content optimization and topical support.",
    settingsSummary:
      "Preserved for content architecture interpretation and supporting SEO execution.",
    evidenceRole:
      "Will provide internal-linking and content-structure context.",
  },
];