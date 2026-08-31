export type PublicEvidenceSourceKind =
  | "industry_report"
  | "benchmark_report"
  | "case_study"
  | "trend_dataset"
  | "news_archive"
  | "web_archive";

export type PublicEvidenceClass =
  | "observed"
  | "reported"
  | "benchmark"
  | "estimated"
  | "inferred";

export type PublicEvidenceApplicability =
  | "analytics"
  | "seo"
  | "paid_media"
  | "local_search"
  | "behavior"
  | "conversion"
  | "customer_experience"
  | "market_demand"
  | "campaign_strategy";

export type PublicMarketEvidenceSource = {
  sourceId: string;
  title: string;
  publisher: string;
  sourceKind: PublicEvidenceSourceKind;
  publicationYear: number;
  sourceUrl: string;
  accessMode: "open" | "gated" | "paid" | "api";
  reliability: "low" | "medium" | "high";
  notes: string;
};

export type PublicMarketEvidenceCard = {
  evidenceId: string;
  sourceId: string;
  industry: string;
  subIndustry?: string;
  region: string;
  year: number;
  topic: string;
  evidenceClass: PublicEvidenceClass;
  applicability: PublicEvidenceApplicability[];
  claim: string;
  reasoningUse: string;
  confidence: number;
  sourceUrl: string;
};

export type PublicMarketEvidenceQuery = {
  projectLabel: string;
  projectSlug: string;
  industry?: string | null;
  region?: string | null;
  topics?: string[];
  limit?: number;
};

export type PublicMarketEvidenceBundle = {
  sources: PublicMarketEvidenceSource[];
  cards: PublicMarketEvidenceCard[];
  coverage: {
    totalCards: number;
    matchedCards: number;
    industries: string[];
    topics: string[];
    confidenceAverage: number;
  };
};
