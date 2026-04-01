export type OutcomeInsightStat = {
  label: string;
  value: string | number;
  context: string;
};

export type OutcomeInsightAction = {
  actionTitle: string;
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
};

export type OutcomeInsightsPayload = {
  projectId: string;
  summary: string;
  stats: OutcomeInsightStat[];
  topActions: OutcomeInsightAction[];
  weakestActions: OutcomeInsightAction[];
};