export type IntelligenceCategory =
  | "traffic_drop"
  | "query_opportunity"
  | "page_opportunity"
  | "source_concentration"
  | "data_gap"
  | "other";

export type IntelligenceSeverity = "low" | "medium" | "high";

export type IntelligenceDataSufficiency =
  | "sufficient"
  | "partial"
  | "insufficient";

export type IntelligenceEvidenceRef = {
  table:
    | "ga4_source_daily"
    | "ga4_landing_page_daily"
    | "gsc_query_daily"
    | "gsc_page_daily";
  from: string;
  to: string;
  filters?: Record<string, string>;
  metrics?: Record<string, number>;
};

export type IntelligenceInsight = {
  insightId: string;
  runKey: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  analysisWindowFrom: string;
  analysisWindowTo: string;
  category: IntelligenceCategory;
  severity: IntelligenceSeverity;
  hypothesisRank: number;
  priorityScore: number;
  impactEstimatedClicks: number;
  evidenceSummary: string;
  missingDataReason: string;
  title: string;
  finding: string;
  rationale: string;
  evidence: IntelligenceEvidenceRef[];
  recommendedAction: string;
  dataSufficiency: IntelligenceDataSufficiency;
  missingData: string[];
  modelProvider: string;
  modelVersion: string;
  generatedAt: string;
};

export type IntelligenceRecommendation = {
  recommendationId: string;
  runKey: string;
  insightId: string;
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  priority: 1 | 2 | 3;
  priorityScore: number;
  title: string;
  action: string;
  expectedOutcome: string;
  evidenceSummary: string;
  impactEstimatedClicks: number;
  evidence: IntelligenceEvidenceRef[];
  generatedAt: string;
};

export type IntelligenceRunInput = {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
};

export type IntelligenceRunOutput = {
  insights: IntelligenceInsight[];
  recommendations: IntelligenceRecommendation[];
};