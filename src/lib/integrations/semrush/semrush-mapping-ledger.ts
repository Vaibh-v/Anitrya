/**
 * Project -> SEMrush domain mapping, stored as a SyncRun ledger entry
 * (same pattern as Google Ads / GBP mappings; no new table needed).
 */
import { SyncSource, SyncStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SEMRUSH_MAPPING_STATUS,
  type SemrushDomainMapping,
} from "@/lib/integrations/semrush/semrush-evidence-contract";
import {
  normalizeSemrushDatabase,
  normalizeSemrushDomain,
} from "@/lib/integrations/semrush/semrush-normalizer";

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readSemrushDomainMappingFromMetadata(
  metadata: unknown,
): SemrushDomainMapping | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  if (record.integrationStatus !== SEMRUSH_MAPPING_STATUS) return null;

  const projectSlug = readString(record.projectSlug);
  const domain = normalizeSemrushDomain(readString(record.domain));
  const databaseCode = normalizeSemrushDatabase(readString(record.databaseCode));

  if (!projectSlug || !domain || !databaseCode) return null;

  return {
    projectSlug,
    domain,
    databaseCode,
    savedAt: readString(record.savedAt) ?? new Date(0).toISOString(),
  };
}

export async function getLatestSemrushDomainMapping(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<SemrushDomainMapping | null> {
  const runs = await prisma.syncRun.findMany({
    where: { workspaceId: input.workspaceId, source: SyncSource.SEMRUSH },
    orderBy: { startedAt: "desc" },
    take: 40,
    select: { metadata: true },
  });

  for (const run of runs) {
    const mapping = readSemrushDomainMappingFromMetadata(run.metadata);
    if (mapping?.projectSlug === input.projectSlug) return mapping;
  }

  return null;
}

export async function recordSemrushDomainMapping(input: {
  workspaceId: string;
  projectSlug: string;
  projectLabel: string;
  domain: string;
  databaseCode?: string | null;
}): Promise<SemrushDomainMapping> {
  const domain = normalizeSemrushDomain(input.domain);
  const databaseCode = normalizeSemrushDatabase(input.databaseCode ?? null);

  if (!domain) throw new Error("A valid domain is required for SEMrush mapping.");
  if (!databaseCode) throw new Error("A valid SEMrush database code is required (e.g. us, uk, in).");

  const savedAt = new Date().toISOString();

  await prisma.syncRun.create({
    data: {
      workspaceId: input.workspaceId,
      source: SyncSource.SEMRUSH,
      status: SyncStatus.SUCCESS,
      rowsSynced: 0,
      metadata: {
        integrationStatus: SEMRUSH_MAPPING_STATUS,
        projectSlug: input.projectSlug,
        projectLabel: input.projectLabel,
        domain,
        databaseCode,
        savedAt,
      },
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  return { projectSlug: input.projectSlug, domain, databaseCode, savedAt };
}
