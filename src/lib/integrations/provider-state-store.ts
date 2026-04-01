import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PROVIDER_IDS,
  providerDefaultReason,
  providerDisplayLabel,
} from "@/lib/integrations/provider-state-contracts";
import type {
  ProviderConnectionState,
  ProviderIntegrationId,
  ProviderStateMutationInput,
  ProviderStateRecord,
  ProviderStateStoreShape,
} from "@/lib/integrations/provider-state-contracts";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "provider-state.json");

const DEFAULT_STORE: ProviderStateStoreShape = {
  records: [],
};

function buildRecordId(input: {
  workspaceId: string;
  projectSlug: string;
  providerId: ProviderIntegrationId;
}): string {
  return `${input.workspaceId}::${input.projectSlug}::${input.providerId}`;
}

async function ensureStoreFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<ProviderStateStoreShape> {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProviderStateStoreShape;

    if (!parsed || !Array.isArray(parsed.records)) {
      return DEFAULT_STORE;
    }

    return parsed;
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: ProviderStateStoreShape): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getProviderStateRecords(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<ProviderStateRecord[]> {
  const store = await readStore();

  const scoped = store.records.filter(
    (record) =>
      record.workspaceId === input.workspaceId &&
      record.projectSlug === input.projectSlug
  );

  const seeded = PROVIDER_IDS.map((providerId) => {
    const existing = scoped.find((record) => record.providerId === providerId);

    if (existing) return existing;

    const seededState: ProviderConnectionState =
      providerId === "google_trends" ? "reserved" : "reserved";

    return {
      id: buildRecordId({
        workspaceId: input.workspaceId,
        projectSlug: input.projectSlug,
        providerId,
      }),
      workspaceId: input.workspaceId,
      projectSlug: input.projectSlug,
      providerId,
      state: seededState,
      scope: "project" as const,
      label: providerDisplayLabel(providerId),
      reason: providerDefaultReason(providerId, seededState),
      metadata: {},
      updatedAt: new Date(0).toISOString(),
    };
  });

  return seeded;
}

export async function upsertProviderStateRecord(
  input: ProviderStateMutationInput
): Promise<ProviderStateRecord> {
  const store = await readStore();

  const id = buildRecordId({
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    providerId: input.providerId,
  });

  const nextRecord: ProviderStateRecord = {
    id,
    workspaceId: input.workspaceId,
    projectSlug: input.projectSlug,
    providerId: input.providerId,
    state: input.state,
    scope: "project",
    label: input.label ?? providerDisplayLabel(input.providerId),
    reason:
      input.reason ??
      providerDefaultReason(input.providerId, input.state),
    metadata: input.metadata ?? {},
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = store.records.filter((record) => record.id !== id);
  nextRecords.push(nextRecord);

  await writeStore({
    records: nextRecords,
  });

  return nextRecord;
}