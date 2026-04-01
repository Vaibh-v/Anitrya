export type IntegrationCatalogItem = {
  key:
    | "google-ga4"
    | "google-gsc"
    | "google-gbp"
    | "google-ads"
    | "google-trends"
    | "meta-ad-library";
  label: string;
  statusLabel: "Connected" | "Preserved" | "Planned";
  category: "core" | "expansion" | "market";
  description: string;
  futureValue: string;
  intelligenceRole: string;
};

export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  {
    key: "google-ga4",
    label: "Google Analytics 4",
    statusLabel: "Connected",
    category: "core",
    description:
      "Traffic, engagement, landing-page quality, and source/channel behavior evidence.",
    futureValue:
      "Feeds behavior interpretation, landing quality diagnostics, and cross-source reasoning.",
    intelligenceRole:
      "Primary on-site behavior and acquisition-quality signal source.",
  },
  {
    key: "google-gsc",
    label: "Google Search Console",
    statusLabel: "Connected",
    category: "core",
    description:
      "Search visibility, query evidence, page evidence, CTR signals, and ranking capture.",
    futureValue:
      "Feeds SEO diagnostics, search interpretation, and cross-source search-to-behavior alignment.",
    intelligenceRole:
      "Primary search-demand and click-capture evidence source.",
  },
  {
    key: "google-gbp",
    label: "Google Business Profile",
    statusLabel: "Preserved",
    category: "expansion",
    description:
      "Local presence, discovery demand, calls, website clicks, direction requests, and location activity.",
    futureValue:
      "Will extend local-intent reasoning and offline-to-online performance interpretation.",
    intelligenceRole:
      "Local demand and location-performance evidence layer.",
  },
  {
    key: "google-ads",
    label: "Google Ads",
    statusLabel: "Preserved",
    category: "expansion",
    description:
      "Paid clicks, spend, conversions, impression share, and campaign efficiency context.",
    futureValue:
      "Will extend paid-acquisition reasoning and connect spend quality to on-site outcomes.",
    intelligenceRole:
      "Paid media efficiency and campaign-quality evidence layer.",
  },
  {
    key: "google-trends",
    label: "Google Trends",
    statusLabel: "Preserved",
    category: "market",
    description:
      "Demand movement, topic momentum, seasonality context, and branded versus category interest curves.",
    futureValue:
      "Will strengthen market-demand interpretation and help separate internal issues from market shifts.",
    intelligenceRole:
      "External demand and category-momentum evidence layer.",
  },
  {
    key: "meta-ad-library",
    label: "Meta Ad Library",
    statusLabel: "Preserved",
    category: "market",
    description:
      "Competitive creative visibility and ad-market activity context.",
    futureValue:
      "Will extend competitor-context reasoning and external market-pressure interpretation.",
    intelligenceRole:
      "Competitive-market and creative-pressure context layer.",
  },
];