export type DecisionBriefEvidence = {
  label: string;
  detail: string;
};

export type DecisionBriefBlocker = {
  label: string;
  reason: string;
};

export type DecisionBrief = {
  projectId: string;
  headline: string;
  priority: "high" | "medium" | "low";
  summary: string;
  supportingEvidence: DecisionBriefEvidence[];
  blockers: DecisionBriefBlocker[];
  orderedActions: string[];
};