import type { ExecutionRecord, ExecutionStatus } from "./execution-state-contracts";

const store = new Map<string, ExecutionRecord>();

function buildKey(projectId: string, actionTitle: string) {
  return `${projectId}:${actionTitle}`;
}

export function upsertExecutionState(input: {
  projectId: string;
  actionTitle: string;
  status: ExecutionStatus;
}) {
  const key = buildKey(input.projectId, input.actionTitle);

  const record: ExecutionRecord = {
    id: key,
    projectId: input.projectId,
    actionTitle: input.actionTitle,
    status: input.status,
    updatedAt: Date.now(),
  };

  store.set(key, record);

  return record;
}

export function getExecutionStates(projectId: string): ExecutionRecord[] {
  return Array.from(store.values()).filter(
    (item) => item.projectId === projectId
  );
}