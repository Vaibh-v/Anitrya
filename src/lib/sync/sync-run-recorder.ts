import { Prisma, SyncSource, SyncStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function normalizeSyncSource(source: string): SyncSource {
  const normalized = source.trim().toUpperCase();

  const map: Record<string, SyncSource> = {
    GOOGLE_GA4: SyncSource.GOOGLE_GA4,
    GOOGLE_GSC: SyncSource.GOOGLE_GSC,
    GOOGLE_ADS: SyncSource.GOOGLE_ADS,
    GOOGLE_GBP: SyncSource.GOOGLE_GBP,

    google_ga4: SyncSource.GOOGLE_GA4,
    google_gsc: SyncSource.GOOGLE_GSC,
    google_ads: SyncSource.GOOGLE_ADS,
    google_gbp: SyncSource.GOOGLE_GBP,
  };

  const resolved = map[source] ?? map[normalized];

  if (!resolved) {
    throw new Error(`Unsupported sync source: ${source}`);
  }

  return resolved;
}

function normalizeSyncStatus(status: "success" | "error" | "running"): SyncStatus {
  if (status === "success") return SyncStatus.SUCCESS;
  if (status === "error") return SyncStatus.ERROR;
  return SyncStatus.RUNNING;
}

export async function recordManualSyncRun(input: {
  workspaceId: string;
  source: string;
  status: "success" | "error" | "running";
  rowsSynced?: number | null;
  meta?: Record<string, unknown>;
  error?: string | null;
}) {
  const metadata = (input.meta ?? {}) as Prisma.InputJsonValue;

  return prisma.syncRun.create({
    data: {
      workspaceId: input.workspaceId,
      source: normalizeSyncSource(input.source),
      status: normalizeSyncStatus(input.status),
      rowsSynced: input.rowsSynced ?? 0,
      startedAt: new Date(),
      endedAt: input.status === "running" ? null : new Date(),
      error: input.error ?? null,
      metadata,
    },
  });
}