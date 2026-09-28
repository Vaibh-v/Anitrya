/**
 * Instant tabs: page aggregates and intelligence are cached per project and
 * date range, and dropped the moment a sync writes new evidence for that
 * project (see sync-audit). A 6-hour ceiling covers anything missed.
 */
import { getGeoSummary } from "@/lib/integrations/google/ga4/fetch-ga4-geo";
import { revalidateTag, unstable_cache } from "next/cache";
import { getBehaviorDetail, getSeoDetail } from "@/lib/evidence/page-insights";
import { getOverviewEvidenceSummary } from "@/lib/evidence/normalized-overview-store";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";
import type { IntelligenceRunInput } from "@/lib/intelligence/contracts";

const SIX_HOURS = 6 * 3600;

export function evidenceTag(workspaceId: string, projectSlug: string) {
  return `evidence:${workspaceId}:${projectSlug}`;
}

type Scope = { workspaceId: string; projectSlug: string; from: string; to: string };

export function cachedSeoDetail(scope: Scope) {
  return unstable_cache(() => getSeoDetail(scope), ["seo", scope.workspaceId, scope.projectSlug, scope.from, scope.to], {
    tags: [evidenceTag(scope.workspaceId, scope.projectSlug)],
    revalidate: SIX_HOURS,
  })();
}

export function cachedBehaviorDetail(scope: Scope) {
  return unstable_cache(() => getBehaviorDetail(scope), ["behavior", scope.workspaceId, scope.projectSlug, scope.from, scope.to], {
    tags: [evidenceTag(scope.workspaceId, scope.projectSlug)],
    revalidate: SIX_HOURS,
  })();
}

export function cachedOverviewSummary(input: { workspaceId: string; projectId: string; from: string; to: string }) {
  return unstable_cache(
    async () => {
      const summary = await getOverviewEvidenceSummary(input);
      // Never cache a failure; the next request retries.
      if (summary.failureReason) throw new Error(summary.failureReason);
      return summary;
    },
    ["overview", input.workspaceId, input.projectId, input.from, input.to],
    { tags: [evidenceTag(input.workspaceId, input.projectId)], revalidate: SIX_HOURS },
  )().catch(() => getOverviewEvidenceSummary(input));
}

export function cachedGeo(input: { workspaceId: string; projectSlug: string; from: string; to: string }) {
  return unstable_cache(
    () => getGeoSummary(input),
    ["geo-v1", input.workspaceId, input.projectSlug, input.from, input.to],
    { tags: [evidenceTag(input.workspaceId, input.projectSlug)], revalidate: SIX_HOURS },
  )().catch(() => ({ countries: [], regions: [], cities: [], totalSessions: 0 }));
}

export function cachedIntelligence(input: IntelligenceRunInput) {
  return unstable_cache(
    () => runIntelligence(input),
    ["intelligence-v2.2", input.workspaceId, input.projectSlug, input.from, input.to],
    { tags: [evidenceTag(input.workspaceId, input.projectSlug)], revalidate: SIX_HOURS },
  )();
}

/** Called after any sync writes evidence for a project. Safe outside a request. */
export function invalidateEvidence(workspaceId: string, projectSlug: string) {
  try {
    revalidateTag(evidenceTag(workspaceId, projectSlug), { expire: 0 });
  } catch (error) {
    console.warn("EVIDENCE_CACHE_INVALIDATE_FAILED", error instanceof Error ? error.message : error);
  }
}
