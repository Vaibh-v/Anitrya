export type CommandCenterPriority = "high" | "medium" | "low";

export type CommandCenterBlocker = {
  label: string;
  reason: string;
};

export type CommandCenterOwnerLoad = {
  owner: "seo" | "marketing" | "ops" | "dev";
  count: number;
};

export type CommandCenterPayload = {
  projectId: string;
  headline: string;
  summary: string;
  priority: CommandCenterPriority;
  overallScore: number;
  strongestCategory: string;
  weakestCategory: string;
  blockers: CommandCenterBlocker[];
  ownerLoad: CommandCenterOwnerLoad[];
  firstActions: string[];
};