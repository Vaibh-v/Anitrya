import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  SyncExecutionState,
  SyncRunRecord,
  SyncStatusSummary,
} from "@/lib/sync/sync-orchestrator-contracts";

type SyncStoreShape = {
  runs: SyncRunRecord[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "sync-status-store.json");

const EMPTY_STORE: SyncStoreShape = {
  runs: [],
};

async function ensureStoreFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<SyncStoreShape> {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SyncStoreShape;

    if (!parsed || !Array.isArray(parsed.runs)) {
      return EMPTY_STORE;
    }

    return parsed;
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: SyncStoreShape): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function createSyncRunRecord(
  input: Omit<SyncRunRecord, "id">
): Promise<SyncRunRecord> {
  const store = await readStore();

  const record: SyncRunRecord = {
    ...input,
    id: `${input.workspaceId}::${input.projectSlug}::${Date.now()}`,
  };

  await writeStore({
    runs: [record, ...store.runs].slice(0, 250),
  });

  return record;
}

export async function updateSyncRunRecord(
  id: string,
  updater: (current: SyncRunRecord) => SyncRunRecord
): Promise<SyncRunRecord | null> {
  const store = await readStore();
  const target = store.runs.find((run) => run.id === id);

  if (!target) return null;

  const next = updater(target);

  await writeStore({
    runs: store.runs.map((run) => (run.id === id ? next : run)),
  });

  return next;
}

export async function getSyncStatusSummary(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<SyncStatusSummary> {
  const scopedRuns = (await readStore()).runs.filter(
    (run) =>
      run.workspaceId === input.workspaceId &&
      run.projectSlug === input.projectSlug
  );

  const latestRun = scopedRuns[0] ?? null;

  const currentState: SyncExecutionState =
    latestRun?.state ?? "idle";

  return {
    currentState,
    latestRun,
    recentRuns: scopedRuns.slice(0, 12),
  };
}