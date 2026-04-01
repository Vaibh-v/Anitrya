export type IntegrationOnboardingCard = {
  id: string;
  title: string;
  description: string;
  category: "core" | "expansion" | "market";
};

export type IntegrationOnboardingGroup = {
  category: "core" | "expansion" | "market";
  label: string;
  integrations: IntegrationOnboardingCard[];
};

export function buildIntegrationOnboardingGroups(): IntegrationOnboardingGroup[] {
  return [
    {
      category: "core",
      label: "Core Data Sources",
      integrations: [
        {
          id: "ga4",
          title: "Google Analytics (GA4)",
          description: "Traffic, behavior, and conversion data",
        },
        {
          id: "gsc",
          title: "Google Search Console",
          description: "Search performance and keyword data",
        },
      ],
    },
    {
      category: "expansion",
      label: "Growth Channels",
      integrations: [
        {
          id: "google_ads",
          title: "Google Ads",
          description: "Paid acquisition and ROI tracking",
        },
        {
          id: "gbp",
          title: "Google Business Profile",
          description: "Local visibility and engagement",
        },
      ],
    },
    {
      category: "market",
      label: "Market Intelligence",
      integrations: [
        {
          id: "google_trends",
          title: "Google Trends",
          description: "Search demand and trend signals",
        },
      ],
    },
  ];
}