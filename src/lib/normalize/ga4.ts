export function normalizeGA4Daily({
  workspaceId,
  propertyId,
  propertyName,
  rows,
}: {
  workspaceId: string;
  propertyId: string;
  propertyName: string;
  rows: any[];
}) {
  return rows.map((r: any) => ({
    workspace_id: workspaceId,
    date: r.date,
    property_id: propertyId,
    property_name: propertyName,
    sessions: r.sessions,
    users: r.users,
    conversions: r.conversions,
    engagement_rate: null,
    avg_session_duration_sec: null,
    source_medium_top: null,
    landing_page_top: null,
  }));
}