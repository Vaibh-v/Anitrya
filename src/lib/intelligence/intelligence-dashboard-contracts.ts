export type IntelligenceHealthStat = {
  label: string;
  value: number | string;
  context: string;
};

export type IntelligenceActionGroup = {
  title: string;
  impact: "low" | "medium" | "high";
  steps: string[];
};

export type IntelligenceDashboardPayload = {
  headline: string;
  projectId: string;
  summary: string;
  stats: IntelligenceHealthStat[];
  actions: IntelligenceActionGroup[];
  memoryCount: number;
};