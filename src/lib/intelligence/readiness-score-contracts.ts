export type IntelligenceCategoryReadiness = {
  key: "overview" | "seo" | "behavior" | "cross-source";
  label: string;
  score: number;
  status: "strong" | "partial" | "blocked";
  reason: string;
};

export type IntelligenceReadinessScore = {
  projectId: string;
  overallScore: number;
  strongestCategory: string;
  weakestCategory: string;
  categories: IntelligenceCategoryReadiness[];
};