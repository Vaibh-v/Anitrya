export type OutcomeStatus =
  | "accepted"
  | "rejected"
  | "implemented"
  | "improved"
  | "no_impact";

export type RecommendationOutcomeView = {
  id: string;
  workspaceId: string;
  projectSlug: string;
  hypothesisTitle: string;
  recommendationTitle: string;
  outcomeStatus: OutcomeStatus;
  outcomeNote: string;
  impactDelta: number;
  createdAt: string;
};