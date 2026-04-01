export type IntegrationOnboardingState =
  | "connected"
  | "available"
  | "preserved";

export type IntegrationOnboardingCategory =
  | "local"
  | "paid"
  | "market";

export type IntegrationOnboardingSource =
  | "google_business_profile"
  | "google_ads"
  | "google_trends";

export type IntegrationOnboardingCard = {
  source: IntegrationOnboardingSource;
  title: string;
  category: IntegrationOnboardingCategory;
  state: IntegrationOnboardingState;
  summary: string;
  reasoningRole: string;
  metrics: string[];
  onboardingSteps: string[];
  mappingLabel: string;
  mappingPlaceholder: string;
  availabilityNote: string;
};

export type IntegrationOnboardingGroup = {
  title: string;
  subtitle: string;
  cards: IntegrationOnboardingCard[];
};