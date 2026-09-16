import { prisma } from "@/lib/prisma";
import type { IntegrationSyncResult } from "@/lib/integrations/sync-contracts";

export type SyncHealthState = "success" | "warning" | "error";

export type SyncHealthOwnerSheet = {
  status: "mirrored" | "skipped" | "error";
  label?: string;
  detail?: string;
  reason?: string;
  missingEnv?: string[];
  actionRequired?: string[];
  masterSpreadsheetId?: string;
  customerSpreadsheetId?: string;
};

export type SyncHealthIntelligence = {
  status: "generated" | "error";
  insights?: number;
  recommendations?: number;
  exportStatus?: "mirrored" | "skipped" | "error";
  exportError?: string;
  error?: string;
  masterSpreadsheetId?: string;
  customerSpreadsheetId?: string;
};

export type SyncHealthRunInput = {
  workspaceId: string;
  projectId?: string | null;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
  sources: IntegrationSyncResult[];
  ownerSheet: SyncHealthOwnerSheet;
  intelligence: SyncHealthIntelligence | null;
  summary: string;
};

export type SyncHealthRunView = {
  id: string;
  state: SyncHealthState;
  projectSlug: string;
  projectLabel: string;
  from: string;
  to: string;
  sources: IntegrationSyncResult[];
  ownerSheet: SyncHealthOwnerSheet | null;
  intelligence: SyncHealthIntelligence | null;
  nextActions: string[];
  totalRowsSynced: number;
  summary: string;
  createdAt: Date;
};

function normalizeState(input: SyncHealthRunInput): SyncHealthState {
  if (
    input.sources.some((source) => source.status === "error") ||
    input.ownerSheet.status === "error" ||
    input.intelligence?.status === "error" ||
    input.intelligence?.exportStatus === "error"
  ) {
    return "error";
  }

  if (
    input.sources.some((source) => source.status === "skipped") ||
    input.ownerSheet.status === "skipped" ||
    input.intelligence?.exportStatus === "skipped"
  ) {
    return "warning";
  }

  return "success";
}

function buildNextActions(input: SyncHealthRunInput): string[] {
  const actions = new Set<string>();

  for (const source of input.sources) {
    if (source.status === "error") {
      actions.add(`Fix ${source.provider}: ${source.reason}`);
    }

    if (source.status === "skipped") {
      actions.add(`Complete ${source.provider} mapping or access: ${source.reason}`);
    }
  }

  for (const action of input.ownerSheet.actionRequired ?? []) {
    actions.add(action);
  }

  if (input.ownerSheet.status === "error") {
    actions.add(input.ownerSheet.reason ?? "Check owner sheet export access.");
  }

  if (input.intelligence?.status === "error") {
    actions.add(input.intelligence.error ?? "Check intelligence generation.");
  }

  if (input.intelligence?.exportStatus === "error") {
    actions.add(input.intelligence.exportError ?? "Check intelligence sheet export.");
  }

  return Array.from(actions);
}

function asRecordArray(value: unknown): IntegrationSyncResult[] {
  return Array.isArray(value) ? (value as IntegrationSyncResult[]) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function recordSyncHealthRun(
  input: SyncHealthRunInput,
): Promise<string | null> {
  const totalRowsSynced = input.sources.reduce(
    (total, source) => total + source.rowsSynced,
    0,
  );
  const state = normalizeState(input);
  const nextActions = buildNextActions(input);

  try {
    const run = await prisma.syncHealthRun.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        projectSlug: input.projectSlug,
        projectLabel: input.projectLabel,
        state,
        from: input.from,
        to: input.to,
        sources: input.sources as never,
        ownerSheet: input.ownerSheet as never,
        intelligence: (input.intelligence ?? null) as never,
        nextActions: nextActions as never,
        totalRowsSynced,
        summary: input.summary,
      },
      select: {
        id: true,
      },
    });

    return run.id;
  } catch (error) {
    console.error("SYNC_HEALTH_RUN_RECORD_FAILED", error);
    return null;
  }
}

export async function listSyncHealthRuns(input: {
  workspaceId: string;
  projectSlug: string;
  take?: number;
}): Promise<SyncHealthRunView[]> {
  const runs = await prisma.syncHealthRun.findMany({
    where: {
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.take ?? 6,
  });

  return runs.map((run) => ({
    id: run.id,
    state: run.state as SyncHealthState,
    projectSlug: run.projectSlug,
    projectLabel: run.projectLabel,
    from: run.from,
    to: run.to,
    sources: asRecordArray(run.sources),
    ownerSheet: run.ownerSheet as SyncHealthOwnerSheet | null,
    intelligence: run.intelligence as SyncHealthIntelligence | null,
    nextActions: asStringArray(run.nextActions),
    totalRowsSynced: run.totalRowsSynced,
    summary: run.summary,
    createdAt: run.createdAt,
  }));
}
