import { SyncSource, SyncStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GoogleAdsAccountAsset } from "@/lib/integrations/google/ads/discovery-contract";

export const GOOGLE_ADS_MAPPING_STATUS = "google_ads_account_mapping_saved";

export type GoogleAdsAccountMappingRecord = {
  projectSlug: string;
  customerId: string;
  resourceName: string;
  displayName: string;
  loginCustomerId: string | null;
  apiVersion: string;
  savedAt: string;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readGoogleAdsAccountMappingFromMetadata(
  metadata: unknown,
): GoogleAdsAccountMappingRecord | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;

  if (record.integrationStatus !== GOOGLE_ADS_MAPPING_STATUS) {
    return null;
  }

  const projectSlug = readString(record.projectSlug);
  const customerId = readString(record.customerId);
  const resourceName = readString(record.resourceName);
  const displayName = readString(record.displayName) ?? customerId;
  const apiVersion = readString(record.apiVersion);

  if (!projectSlug || !customerId || !resourceName || !displayName || !apiVersion) {
    return null;
  }

  return {
    projectSlug,
    customerId,
    resourceName,
    displayName,
    loginCustomerId: readString(record.loginCustomerId),
    apiVersion,
    savedAt: readString(record.savedAt) ?? new Date(0).toISOString(),
  };
}

export async function getLatestGoogleAdsAccountMapping(input: {
  workspaceId: string;
  projectSlug: string;
}): Promise<GoogleAdsAccountMappingRecord | null> {
  const runs = await prisma.syncRun.findMany({
    where: {
      workspaceId: input.workspaceId,
      source: SyncSource.GOOGLE_ADS,
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
    const mapping = readGoogleAdsAccountMappingFromMetadata(run.metadata);
    if (mapping?.projectSlug === input.projectSlug) {
      return mapping;
    }
  }

  return null;
}

export async function recordGoogleAdsAccountMapping(input: {
  workspaceId: string;
  projectSlug: string;
  projectLabel: string;
  asset: GoogleAdsAccountAsset;
}): Promise<GoogleAdsAccountMappingRecord> {
  const savedAt = new Date().toISOString();
  const mapping: GoogleAdsAccountMappingRecord = {
    projectSlug: input.projectSlug,
    customerId: input.asset.metadata.customerId,
    resourceName: input.asset.metadata.resourceName,
    displayName: input.asset.displayName,
    loginCustomerId: input.asset.metadata.loginCustomerId,
    apiVersion: input.asset.metadata.apiVersion,
    savedAt,
  };

  await prisma.syncRun.create({
    data: {
      workspaceId: input.workspaceId,
      source: SyncSource.GOOGLE_ADS,
      status: SyncStatus.SUCCESS,
      rowsSynced: 0,
      metadata: {
        integrationStatus: GOOGLE_ADS_MAPPING_STATUS,
        projectSlug: input.projectSlug,
        projectLabel: input.projectLabel,
        customerId: mapping.customerId,
        resourceName: mapping.resourceName,
        displayName: mapping.displayName,
        loginCustomerId: mapping.loginCustomerId,
        apiVersion: mapping.apiVersion,
        savedAt,
      },
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  return mapping;
}
