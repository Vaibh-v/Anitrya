import type { FutureReadinessPanelData } from "@/lib/intelligence/future-readiness";

export type MarketContextInsightCard = {
  key: string;
  title: string;
  body: string;
  confidence: "low" | "medium" | "high";
  actions: string[];
};

export type MarketContextSection = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  cards: MarketContextInsightCard[];
};

function confidenceFromCount(count: number): "low" | "medium" | "high" {
  if (count >= 3) return "high";
  if (count >= 2) return "medium";
  return "low";
}

export function buildLocalIntentSection(
  futureReadiness: FutureReadinessPanelData
): MarketContextSection {
  const preserved = futureReadiness.rows.find(
    (row) => row.source === "google_business_profile"
  );

  const cards = preserved
    ? [
        {
          key: "gbp-local-demand",
          title: "Local intent evidence layer is preserved",
          body:
            "Google Business Profile is preserved as a future evidence layer for calls, direction requests, website clicks, and local visibility context. Once connected, it will help separate store-level demand from website-level conversion friction.",
          confidence: confidenceFromCount(preserved.nextUnlock.length),
          actions: preserved.nextUnlock.slice(0, 3),
        },
      ]
    : [];

  return {
    title: "Local intent context",
    subtitle:
      "Prepared reasoning surface for Google Business Profile and location-level demand interpretation.",
    emptyTitle: "No local-intent findings yet",
    emptyBody:
      "Once Google Business Profile is connected, this panel will compare local demand signals against on-site performance and conversion quality.",
    cards,
  };
}

export function buildPaidAcquisitionSection(
  futureReadiness: FutureReadinessPanelData
): MarketContextSection {
  const preserved = futureReadiness.rows.find(
    (row) => row.source === "google_ads"
  );

  const cards = preserved
    ? [
        {
          key: "ads-paid-quality",
          title: "Paid acquisition reasoning is preserved",
          body:
            "Google Ads is already preserved as a future evidence layer for campaign performance, search-term quality, and spend-to-outcome efficiency. This will allow the system to compare paid demand against landing-page and conversion quality.",
          confidence: confidenceFromCount(preserved.nextUnlock.length),
          actions: preserved.nextUnlock.slice(0, 3),
        },
      ]
    : [];

  return {
    title: "Paid acquisition context",
    subtitle:
      "Prepared reasoning surface for campaign quality, search-term intent, and spend efficiency.",
    emptyTitle: "No paid-acquisition findings yet",
    emptyBody:
      "Once Google Ads is connected, this panel will surface campaign-level efficiency gaps and compare paid traffic with downstream outcomes.",
    cards,
  };
}

export function buildDemandContextSection(
  futureReadiness: FutureReadinessPanelData
): MarketContextSection {
  const preserved = futureReadiness.rows.find(
    (row) => row.source === "google_trends"
  );

  const cards = preserved
    ? [
        {
          key: "trends-demand-context",
          title: "Demand context is preserved",
          body:
            "Google Trends is preserved as a market-demand layer so the intelligence system can eventually distinguish internal execution issues from broader category or seasonality movement.",
          confidence: confidenceFromCount(preserved.nextUnlock.length),
          actions: preserved.nextUnlock.slice(0, 3),
        },
      ]
    : [];

  return {
    title: "Demand context",
    subtitle:
      "Prepared reasoning surface for brand demand, category movement, and seasonality context.",
    emptyTitle: "No demand-context findings yet",
    emptyBody:
      "Once Google Trends is connected, this panel will show whether visibility changes are internal performance issues or part of larger market movement.",
    cards,
  };
}

export function buildCompetitiveContextSection(): MarketContextSection {
  return {
    title: "Competitive context",
    subtitle:
      "Prepared reasoning surface for Meta Ad Library and external market-pressure interpretation.",
    emptyTitle: "No competitive-context findings yet",
    emptyBody:
      "Once competitive context sources are connected, this panel will show external creative pressure, ad-market activity, and category visibility patterns.",
    cards: [
      {
        key: "meta-ad-library-context",
        title: "Competitive market context is preserved",
        body:
          "Meta Ad Library remains preserved as an external market-context layer so future intelligence can separate internal demand weakness from competitive pressure and shifting creative activity.",
        confidence: "medium",
        actions: [
          "Compare external market pressure against traffic decline timing.",
          "Separate visibility loss from demand compression or competitor activity.",
          "Use competitor context to support stronger intelligence ranking later.",
        ],
      },
    ],
  };
}