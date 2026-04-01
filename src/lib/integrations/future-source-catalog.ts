import type {
  FutureSourceCard,
  FutureSourceGroup,
} from "@/lib/integrations/future-source-contracts";

const GBP_CARD: FutureSourceCard = {
  id: "google_business_profile",
  title: "Google Business Profile",
  category: "local",
  state: "available",
  summary:
    "Unlock local-intent demand, calls, direction requests, website clicks, and location-level performance evidence.",
  reasoningRole:
    "Separates local visibility weakness from website conversion weakness and brings location-level intent into the same reasoning layer.",
  metrics: [
    "Impressions",
    "Website clicks",
    "Calls",
    "Direction requests",
    "Location demand",
  ],
  onboardingSteps: [
    "Start Google OAuth for the business account.",
    "Auto-discover accessible GBP accounts and locations.",
    "Map the selected project to a discovered location.",
    "Persist normalized local-intent evidence into the shared reasoning layer.",
  ],
  mappingLabel: "GBP location mapping",
  mappingPlaceholder:
    "Auto-discovered location will appear here once provider wiring is complete",
  availabilityNote:
    "Must remain OAuth-based and auto-discovered. No manual account ID or API-key setup.",
  actionKind: "oauth_reserved",
};

const GOOGLE_ADS_CARD: FutureSourceCard = {
  id: "google_ads",
  title: "Google Ads",
  category: "paid",
  state: "available",
  summary:
    "Unlock campaign efficiency, search-term quality, cost-to-conversion analysis, and paid-acquisition diagnostics.",
  reasoningRole:
    "Compares paid demand and spend efficiency against landing-page quality and downstream conversion performance.",
  metrics: ["Clicks", "CTR", "Average CPC", "Cost", "Conversions"],
  onboardingSteps: [
    "Start Google OAuth with Ads scope.",
    "Auto-discover accessible Ads accounts.",
    "Map the selected project to a discovered Ads account.",
    "Persist campaign and search-term evidence into normalized structures.",
  ],
  mappingLabel: "Google Ads account mapping",
  mappingPlaceholder:
    "Auto-discovered Ads account will appear here once provider wiring is complete",
  availabilityNote:
    "Must remain OAuth-based and auto-discovered. No manual customer ID flow as the primary setup.",
  actionKind: "oauth_reserved",
};

const GOOGLE_TRENDS_CARD: FutureSourceCard = {
  id: "google_trends",
  title: "Google Trends",
  category: "market",
  state: "preserved",
  summary:
    "Adds demand context, seasonality framing, and brand-versus-category interpretation to intelligence.",
  reasoningRole:
    "Helps separate internal execution weakness from broader market movement and category softness.",
  metrics: [
    "Interest score",
    "Brand demand",
    "Category demand",
    "Seasonality",
  ],
  onboardingSteps: [
    "Define project-linked brand and category topics.",
    "Create topic comparison intake for each mapped project.",
    "Persist trends movement into the same normalized reasoning layer.",
    "Use it to strengthen SEO and acquisition interpretation.",
  ],
  mappingLabel: "Trend topic mapping",
  mappingPlaceholder:
    "Brand and category topic mapping will be defined here as market-context implementation begins",
  availabilityNote:
    "Preserved as a market-context layer and should not be treated as a replacement for connected first-party evidence.",
  actionKind: "topic_mapping_reserved",
};

export function buildFutureSourceGroups(): FutureSourceGroup[] {
  return [
    {
      id: "local",
      title: "Local expansion",
      subtitle:
        "Google Business Profile extends local-intent reasoning and location-level performance interpretation.",
      cards: [GBP_CARD],
    },
    {
      id: "paid",
      title: "Paid acquisition expansion",
      subtitle:
        "Google Ads extends campaign efficiency, search-term quality, and paid-outcome interpretation.",
      cards: [GOOGLE_ADS_CARD],
    },
    {
      id: "market",
      title: "Market context expansion",
      subtitle:
        "Google Trends extends demand context, seasonality framing, and brand-versus-category comparison.",
      cards: [GOOGLE_TRENDS_CARD],
    },
  ];
}