export type ActivityFeedTone = "neutral" | "positive" | "warning";

export type ActivityFeedItem = {
  id: string;
  type: "execution" | "outcome" | "learning";
  title: string;
  description: string;
  tone: ActivityFeedTone;
  timestamp: number;
  meta: string[];
};

export type ActivityFeedCounts = {
  executionCount: number;
  outcomeCount: number;
  positiveOutcomeCount: number;
  warningCount: number;
};

export type ActivityFeedPayload = {
  projectId: string;
  summary: string;
  counts: ActivityFeedCounts;
  items: ActivityFeedItem[];
};