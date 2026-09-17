import { SyncSource, SyncStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GoogleBusinessProfileLocationAsset } from "@/lib/integrations/google/gbp/discovery-contract";

export const GBP_MAPPING_STATUS = "gbp_location_mapping_saved";

export type GbpLocationMappingRecord = {
  projectSlug: string;
  locationName: string;
  displayName: string;
  accountName: string | null;
  storeCode: string | null;
  primaryCategory: string | null;
  locality: string | null;
  regionCode: string | null;
  savedAt: string;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readGbpLocationMappingFromMetadata(
  metadata: unknown,
): GbpLocationMappingRecord | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;

  if (record.integrationStatus !== GBP_MAPPING_STATUS) {
    return null;
  }

  const projectSlug = readString(record.projectSlug);
  const locationName = readString(record.locationName);
  const displayName = readString(record.displayName) ?? locationName;

  if (!projectSlug || !locationName || !displayName) {
    return null;
  }

  return {
    projectSlug,
    locationName,
    displayName,
    accountName: readString(record.accountName),
    storeCode: readString(record.storeCode),
    primaryCategory: readString(record.primaryCategory),
    locality: readString(record.locality),
    regionCode: readString(record.regionCode),
    savedAt: readString(record.savedAt) ?? new Date(0).toISOString(),
  };
}

export async function getLatestGbpLocationMapping(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<GbpLocationMappingRecord | null> {
  const runs = await prisma.syncRun.findMany({
    where: {
      workspaceId: input.workspaceId,
      source: SyncSource.GOOGLE_GBP,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 40,
    select: {
      metadata: true,
    },
  });

  for (const run of runs) {
    const mapping = readGbpLocationMappingFromMetadata(run.metadata);
    if (mapping?.projectSlug === input.projectSlug) {
      return mapping;
    }
  }

  return null;
}

export async function recordGbpLocationMapping(input: {
  workspaceId: string;
  projectSlug: string;
  projectLabel: string;
  asset: GoogleBusinessProfileLocationAsset;
}): Promise<GbpLocationMappingRecord> {
  const savedAt = new Date().toISOString();
  const mapping: GbpLocationMappingRecord = {
    projectSlug: input.projectSlug,
    locationName: input.asset.sourceId,
    displayName: input.asset.displayName,
    accountName: input.asset.metadata.accountName,
    storeCode: input.asset.metadata.storeCode,
    primaryCategory: input.asset.metadata.primaryCategory,
    locality: input.asset.metadata.locality,
    regionCode: input.asset.metadata.regionCode,
    savedAt,
  };

  await prisma.syncRun.create({
    data: {
      workspaceId: input.workspaceId,
      source: SyncSource.GOOGLE_GBP,
      status: SyncStatus.SUCCESS,
      rowsSynced: 0,
      metadata: {
        integrationStatus: GBP_MAPPING_STATUS,
        projectSlug: input.projectSlug,
        projectLabel: input.projectLabel,
        locationName: mapping.locationName,
        displayName: mapping.displayName,
        accountName: mapping.accountName,
        storeCode: mapping.storeCode,
        primaryCategory: mapping.primaryCategory,
        locality: mapping.locality,
        regionCode: mapping.regionCode,
        savedAt,
      },
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  return mapping;
}
