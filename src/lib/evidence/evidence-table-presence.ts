import { prisma } from "@/lib/prisma";

export type EvidenceTablePresence = {
  ga4SourceDaily: boolean;
  ga4LandingPageDaily: boolean;
  gscQueryDaily: boolean;
  gscPageDaily: boolean;
  googleAdsCampaignDaily: boolean;
  gbpLocationDaily: boolean;
  semrushEvidenceSnapshot: boolean;
};

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '${tableName.replace(/'/g, "''")}'
      ) AS exists
    `);

    return Boolean(result?.[0]?.exists);
  } catch {
    return false;
  }
}

export async function getEvidenceTablePresence(): Promise<EvidenceTablePresence> {
  const [
    ga4SourceDaily,
    ga4LandingPageDaily,
    gscQueryDaily,
    gscPageDaily,
    googleAdsCampaignDaily,
    gbpLocationDaily,
    semrushEvidenceSnapshot,
  ] = await Promise.all([
    tableExists("ga4_source_daily"),
    tableExists("ga4_landing_page_daily"),
    tableExists("gsc_query_daily"),
    tableExists("gsc_page_daily"),
    tableExists("google_ads_campaign_daily"),
    tableExists("gbp_location_daily"),
    tableExists("semrush_evidence_snapshot"),
  ]);

  return {
    ga4SourceDaily,
    ga4LandingPageDaily,
    gscQueryDaily,
    gscPageDaily,
    googleAdsCampaignDaily,
    gbpLocationDaily,
    semrushEvidenceSnapshot,
  };
}
