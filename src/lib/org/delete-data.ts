/**
 * Owner-requested deletion of an organization's data. Removes every synced
 * row, project, Google connection, AI answer and outcome. The organization,
 * its members and its plan stay, so the owner can reconnect or close the
 * account. Rows already copied to the founder's archive sheets are removed
 * on request by the founder (stated in the privacy policy).
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";

const RAW_TABLES = [
  "ga4_source_daily",
  "ga4_landing_page_daily",
  "ga4_geo_daily",
  "gsc_query_daily",
  "gsc_page_daily",
  "gsc_query_monthly",
  "gbp_location_daily",
  "google_ads_campaign_daily",
  "semrush_evidence_snapshot",
  "intelligence_history",
  "recommendation_outcomes",
  "recommendation_outcome",
  "ai_memory",
  "member_scope",
];

export async function deleteOrganizationData(workspaceId: string) {
  await ensureAdditiveSchema();
  const removed: Record<string, number> = {};
  for (const table of RAW_TABLES) {
    const exists = await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(`SELECT to_regclass($1) IS NOT NULL AS ok`, table);
    if (!exists[0]?.ok) continue;
    removed[table] = await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE workspace_id = $1`, workspaceId);
  }
  const where = { where: { workspaceId } };
  const [projects, gsc, ga4, insights, runs, health, tokens] = await prisma.$transaction([
    prisma.project.deleteMany(where),
    prisma.gscSite.deleteMany(where),
    prisma.ga4Property.deleteMany(where),
    prisma.insight.deleteMany(where),
    prisma.syncRun.deleteMany(where),
    prisma.syncHealthRun.deleteMany(where),
    prisma.integrationToken.deleteMany(where),
  ]);
  Object.assign(removed, { projects: projects.count, gscSites: gsc.count, ga4Properties: ga4.count, insights: insights.count, syncRuns: runs.count + health.count, googleConnections: tokens.count });
  return removed;
}
