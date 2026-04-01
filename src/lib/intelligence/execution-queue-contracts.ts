export type IntelligenceExecutionItem = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  blockedBy: string[];
  recommendedOwner: "seo" | "marketing" | "ops" | "dev";
};

export type IntelligenceExecutionQueue = {
  projectId: string;
  items: IntelligenceExecutionItem[];
};