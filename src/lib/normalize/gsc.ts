export function normalizeGSCDaily({
  workspaceId,
  siteUrl,
  rows,
}: {
  workspaceId: string;
  siteUrl: string;
  rows: any[];
}) {
  return rows.map((r: any) => ({
    workspace_id: workspaceId,
    date: new Date().toISOString().slice(0, 10),
    site_url: siteUrl,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    avg_position: r.position,
    top_query: r.keys?.[0] ?? null,
    top_page: r.keys?.[1] ?? null,
  }));
}

export function normalizeGSCRankings({
  workspaceId,
  siteUrl,
  rows,
}: {
  workspaceId: string;
  siteUrl: string;
  rows: any[];
}) {
  return rows.map((r: any) => ({
    workspace_id: workspaceId,
    date: new Date().toISOString().slice(0, 10),
    domain: "",
    site_url: siteUrl,
    keyword: r.keys?.[0] ?? "",
    position: r.position,
    url: r.keys?.[1] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    search_volume: null,
    kd: null,
    cpc: null,
    intent: null,
  }));
}