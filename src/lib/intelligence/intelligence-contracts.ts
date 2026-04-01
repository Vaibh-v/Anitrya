export type IntelligenceEvidencePoint = {
  source: string;
  metric: string;
  value: number | string | null;
  note?: string;
};

export type IntelligenceMissingData = {
  source: string;
  reason: string;
};

export type IntelligenceAction = {
  title: string;
  steps: string[];
  impact: "low" | "medium" | "high";
};

export type IntelligenceSummary = {
  projectId: string;
  headline: string;
  summary: string;
  evidence: IntelligenceEvidencePoint[];
  missingData: IntelligenceMissingData[];
  actions: IntelligenceAction[];
};