export type ExecutionStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "completed";

export type ExecutionRecord = {
  id: string;
  projectId: string;
  actionTitle: string;
  status: ExecutionStatus;
  updatedAt: number;
};