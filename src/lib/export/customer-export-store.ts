import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CustomerExportRecord } from "@/lib/export/customer-sheet-contracts";

type CustomerExportStore = {
  records: CustomerExportRecord[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "customer-export-store.json");

async function ensureStoreFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    const seed: CustomerExportStore = { records: [] };
    await writeFile(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readStore(): Promise<CustomerExportStore> {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CustomerExportStore;

    if (!parsed || !Array.isArray(parsed.records)) {
      return { records: [] };
    }

    return parsed;
  } catch {
    return { records: [] };
  }
}

async function writeStore(store: CustomerExportStore): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordCustomerExport(
  record: Omit<CustomerExportRecord, "id" | "createdAt">
): Promise<CustomerExportRecord> {
  const store = await readStore();

  const nextRecord: CustomerExportRecord = {
    id: `${record.workspaceId}::${record.projectSlug}::${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };

  await writeStore({
    records: [nextRecord, ...store.records].slice(0, 100),
  });

  return nextRecord;
}