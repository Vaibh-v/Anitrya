import { prisma } from "@/lib/prisma";

export type SyncRunRecorderInput = {
  workspaceId: string;
  source: string;
  status: "success" | "error" | "running";
  rowsSynced?: number | null;
  meta?: Record<string, unknown>;
  error?: string | null;
};

const SOURCE_MAP: Record<string, string> = {
  entity_sync: "GOOGLE_GA4",
  GOOGLE_GA4: "GOOGLE_GA4",
  GOOGLE_GSC: "GOOGLE_GSC",
};

const STATUS_MAP: Record<SyncRunRecorderInput["status"], string> = {
  success: "SUCCESS",
  error: "ERROR",
  running: "RUNNING",
};

export async function recordManualSyncRun(
  input: SyncRunRecorderInput
): Promise<void> {
  const mappedSource = SOURCE_MAP[input.source];

  if (!mappedSource) {
    return;
  }

  const mappedStatus = STATUS_MAP[input.status];

  try {
    await prisma.syncRun.create({
      data: {
        workspaceId: input.workspaceId,
        source: mappedSource as never,
        status: mappedStatus as never,
        rowsSynced: input.rowsSynced ?? 0,
        error: input.error ?? null,
        metadata: (input.meta ?? {}) as never,
        startedAt: new Date(),
        endedAt: input.status === "running" ? null : new Date(),
      },
    });
  } catch {
    // Do not let audit logging break the actual sync flow.
  }
}