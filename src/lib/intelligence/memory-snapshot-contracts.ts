export type IntelligenceMemorySnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  headline: string;
  summary: string;
  categories: string[];
  confidence: "low" | "medium" | "high";
};