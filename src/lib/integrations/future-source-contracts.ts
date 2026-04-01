export type FutureSourceId =
  | "google_business_profile"
  | "google_ads"
  | "google_trends";

export type FutureSourceCategory = "local" | "paid" | "market";

export type FutureSourceState =
  | "connected"
  | "available"
  | "preserved"
  | "blocked";

export type FutureSourceActionKind =
  | "oauth_reserved"
  | "topic_mapping_reserved"
  | "provider_wiring_required";

export type FutureSourceMetric =
  | "Impressions"
  | "Website clicks"
  | "Calls"
  | "Direction requests"
  | "Location demand"
  | "Clicks"
  | "CTR"
  | "Average CPC"
  | "Cost"
  | "Conversions"
  | "Interest score"
  | "Brand demand"
  | "Category demand"
  | "Seasonality";

export type FutureSourceCard = {
  id: FutureSourceId;
  title: string;
  category: FutureSourceCategory;
  state: FutureSourceState;
  summary: string;
  reasoningRole: string;
  metrics: FutureSourceMetric[];
  onboardingSteps: string[];
  mappingLabel: string;
  mappingPlaceholder: string;
  availabilityNote: string;
  actionKind: FutureSourceActionKind;
};

export type FutureSourceGroup = {
  id: FutureSourceCategory;
  title: string;
  subtitle: string;
  cards: FutureSourceCard[];
};

export type FutureSourceWorkspaceStats = {
  connected: number;
  available: number;
  preserved: number;
  blocked: number;
};