/**
 * SEMrush sync runner — server-side only, independently runnable.
 *
 * Always returns a visible IntegrationSyncResult:
 *   skipped  — no key / key not encrypted / no project mapping /
 *              SEMrush has no data for the domain / snapshot already fresh
 *   error    — key cannot be decrypted, SEMrush API error, storage failure
 *   success  — rows normalized and stored
 *
 * No mock data: if SEMrush returns nothing, nothing is stored.
 */
import type {
  IntegrationSyncContext,
  IntegrationSyncResult,
  IntegrationSyncRunner,
} from "@/lib/integrations/sync-contracts";
import {
  SEMRUSH_KEYWORD_LIMIT_ENV,
  type SemrushEvidenceRow,
} from "@/lib/integrations/semrush/semrush-evidence-contract";
import { fetchSemrushReport } from "@/lib/integrations/semrush/semrush-client";
import {
  normalizeDomainOrganic,
  normalizeDomainRanks,
  normalizeSemrushDomain,
  resolveSemrushKeywordLimit,
  utcDateString,
} from "@/lib/integrations/semrush/semrush-normalizer";
import {
  countSemrushSnapshotRows,
  ensureSemrushEvidenceTable,
  replaceSemrushSnapshot,
} from "@/lib/integrations/semrush/semrush-evidence-store";
import { getLatestSemrushDomainMapping } from "@/lib/integrations/semrush/semrush-mapping-ledger";
import { resolveSemrushApiKey } from "@/lib/integrations/semrush/semrush-readiness";

const PROVIDER = "SEMRUSH" as const;

function skipped(reason: string, details?: Record<string, unknown>): IntegrationSyncResult {
  return { provider: PROVIDER, status: "skipped", reason, rowsSynced: 0, details };
}

function failed(reason: string, details?: Record<string, unknown>): IntegrationSyncResult {
  return { provider: PROVIDER, status: "error", reason, rowsSynced: 0, details };
}

export type RunSemrushSyncOptions = {
  /** Re-fetch even if today's snapshot already exists (spends API units). */
  force?: boolean;
  /** Injectable clock for tests. */
  now?: Date;
};

export async function runSemrushSync(
  context: IntegrationSyncContext,
  options: RunSemrushSyncOptions = {},
): Promise<IntegrationSyncResult> {
  const projectSlug = context.mapping.projectSlug;

  // 1. Key (skip when missing — never an error).
  const key = await resolveSemrushApiKey(context.workspaceId);
  if (key.status === "missing") {
    // Optional provider not adopted: visible, but informational only.
    return skipped(key.reason, { keyState: key.status, severity: "info" });
  }
  if (key.status === "unencrypted") {
    return skipped(key.reason, { keyState: key.status });
  }
  if (key.status !== "ok") {
    return failed(key.reason, { keyState: key.status });
  }

  // 2. Project mapping.
  const mapping = await getLatestSemrushDomainMapping({
    workspaceId: context.workspaceId,
    projectSlug,
  });

  if (!mapping) {
    return skipped("This project does not have a saved SEMrush domain mapping.", {
      suggestedDomain: normalizeSemrushDomain(context.mapping.gscSiteUrl),
    });
  }

  const now = options.now ?? new Date();
  const snapshotDate = utcDateString(now);
  const baseDetails = {
    domain: mapping.domain,
    databaseCode: mapping.databaseCode,
    snapshotDate,
  };

  // 3. Storage (self-healing; failure is visible, never silent).
  try {
    await ensureSemrushEvidenceTable();
  } catch (error) {
    return failed(
      `SEMrush storage is unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
      baseDetails,
    );
  }

  // 4. Freshness guard — SEMrush data is a snapshot; avoid spending units twice a day.
  if (!options.force) {
    const existing = await countSemrushSnapshotRows({
      workspaceId: context.workspaceId,
      projectSlug,
      domain: mapping.domain,
      databaseCode: mapping.databaseCode,
      date: snapshotDate,
    });

    if (existing > 0) {
      return skipped(
        `SEMrush snapshot for ${mapping.domain} (${mapping.databaseCode}) already stored today (${existing} rows); skipped to conserve API units.`,
        { ...baseDetails, existingRows: existing, freshness: "fresh" },
      );
    }
  }

  // 5. Fetch.
  const limit = resolveSemrushKeywordLimit(process.env[SEMRUSH_KEYWORD_LIMIT_ENV]);
  const [ranks, organic] = await Promise.all([
    fetchSemrushReport({
      apiKey: key.apiKey,
      type: "domain_ranks",
      domain: mapping.domain,
      databaseCode: mapping.databaseCode,
    }),
    fetchSemrushReport({
      apiKey: key.apiKey,
      type: "domain_organic",
      domain: mapping.domain,
      databaseCode: mapping.databaseCode,
      limit,
    }),
  ]);

  const reportStatus = { domain_ranks: ranks.status, domain_organic: organic.status };

  if (ranks.status === "error" || organic.status === "error") {
    const reasons = [ranks, organic]
      .filter((report): report is Extract<typeof report, { status: "error" }> => report.status === "error")
      .map((report) => report.message);
    return failed(Array.from(new Set(reasons)).join(" "), { ...baseDetails, reportStatus });
  }

  if (ranks.status === "not_found" && organic.status === "not_found") {
    return skipped(
      `SEMrush has no data for ${mapping.domain} in the "${mapping.databaseCode}" database.`,
      { ...baseDetails, reportStatus, availability: "not_found" },
    );
  }

  // 6. Normalize.
  const normalizeContext = {
    workspaceId: context.workspaceId,
    projectSlug,
    domain: mapping.domain,
    databaseCode: mapping.databaseCode,
    snapshotDate,
    windowFrom: context.from,
    windowTo: context.to,
    fetchedAt: now.toISOString(),
  };

  const rows: SemrushEvidenceRow[] = [
    ...(ranks.status === "ok" ? normalizeDomainRanks(ranks.rows, normalizeContext) : []),
    ...(organic.status === "ok"
      ? normalizeDomainOrganic(organic.rows, { ...normalizeContext, limit })
      : []),
  ];

  const keywordCount = organic.status === "ok" ? organic.rows.length : 0;

  if (rows.length === 0) {
    return skipped(
      `SEMrush returned no usable metrics for ${mapping.domain} (${mapping.databaseCode}).`,
      { ...baseDetails, reportStatus },
    );
  }

  // 7. Store (idempotent per snapshot day).
  const rowsSynced = await replaceSemrushSnapshot({
    workspaceId: context.workspaceId,
    projectSlug,
    domain: mapping.domain,
    databaseCode: mapping.databaseCode,
    date: snapshotDate,
    rows,
  });

  return {
    provider: PROVIDER,
    status: "success",
    reason: `${rowsSynced} SEMrush evidence row(s) stored for ${mapping.domain} (${mapping.databaseCode}).`,
    rowsSynced,
    details: {
      ...baseDetails,
      reportStatus,
      keywordCount,
      keywordLimit: limit,
      keywordSampleTruncated: keywordCount >= limit,
    },
  };
}

export const semrushSyncRunner: IntegrationSyncRunner = {
  provider: PROVIDER,

  // Readiness is async (key, mapping, storage), so it is evaluated inside
  // sync() and reported as a visible "skipped" result.
  canRun() {
    return true;
  },

  skipReason() {
    return "SEMrush is not configured for this project.";
  },

  sync(context: IntegrationSyncContext) {
    return runSemrushSync(context);
  },
};
