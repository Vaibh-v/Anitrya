import { prisma } from "@/lib/prisma";

export type CustomerSheetExportBundle = {
  workspace: string[][];
  overview: string[][];
  ga4Sources: string[][];
  ga4LandingPages: string[][];
  gscQueries: string[][];
  gscPages: string[][];
  gbpLocations: string[][];
  notes: string[][];
};

type Input = {
  workspaceId: string;
  projectId: string;
  projectLabel: string;
  from: string;
  to: string;
};

export async function buildCustomerSheetExportBundle(
  input: Input
): Promise<CustomerSheetExportBundle> {
  const [ga4Sources, ga4LandingPages, gscQueries, gscPages, gbpLocations] =
    await Promise.all([
      prisma.$queryRaw<
        Array<{
          date: string;
          source: string | null;
          sessions: number | null;
        }>
      >`
        SELECT date, source, sessions
        FROM ga4_source_daily
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectId}
          AND date >= ${input.from}
          AND date <= ${input.to}
        ORDER BY date ASC, source ASC
      `,
      prisma.$queryRaw<
        Array<{
          date: string;
          landing_page: string | null;
          sessions: number | null;
        }>
      >`
        SELECT date, landing_page, sessions
        FROM ga4_landing_page_daily
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectId}
          AND date >= ${input.from}
          AND date <= ${input.to}
        ORDER BY date ASC, landing_page ASC
      `,
      prisma.$queryRaw<
        Array<{
          date: string;
          query: string | null;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          position: number | null;
        }>
      >`
        SELECT date, query, clicks, impressions, ctr, position
        FROM gsc_query_daily
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectId}
          AND date >= ${input.from}
          AND date <= ${input.to}
        ORDER BY date ASC, query ASC
      `,
      prisma.$queryRaw<
        Array<{
          date: string;
          page: string | null;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          position: number | null;
        }>
      >`
        SELECT date, page, clicks, impressions, ctr, position
        FROM gsc_page_daily
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectId}
          AND date >= ${input.from}
          AND date <= ${input.to}
        ORDER BY date ASC, page ASC
      `,
      prisma.$queryRaw<
        Array<{
          date: string;
          location_name: string | null;
          location_label: string | null;
          account_name: string | null;
          metric: string | null;
          value: number | null;
        }>
      >`
        SELECT date, location_name, location_label, account_name, metric, value
        FROM gbp_location_daily
        WHERE workspace_id = ${input.workspaceId}
          AND project_slug = ${input.projectId}
          AND date >= ${input.from}
          AND date <= ${input.to}
        ORDER BY date ASC, metric ASC
      `,
    ]);

  return {
    workspace: [
      ["workspace_id", "project_id", "project_label", "from", "to"],
      [input.workspaceId, input.projectId, input.projectLabel, input.from, input.to],
    ],
    overview: [
      ["metric", "value"],
      ["project_id", input.projectId],
      ["project_label", input.projectLabel],
      ["from", input.from],
      ["to", input.to],
      ["ga4_source_rows", String(ga4Sources.length)],
      ["ga4_landing_rows", String(ga4LandingPages.length)],
      ["gsc_query_rows", String(gscQueries.length)],
      ["gsc_page_rows", String(gscPages.length)],
      ["gbp_location_rows", String(gbpLocations.length)],
    ],
    ga4Sources: [
      ["date", "source", "sessions"],
      ...(
        ga4Sources.length
          ? ga4Sources.map((row) => [
              row.date ?? "",
              row.source ?? "",
              String(row.sessions ?? 0),
            ])
          : [["", "No GA4 source rows found for this range", "0"]]
      ),
    ],
    ga4LandingPages: [
      ["date", "landing_page", "sessions"],
      ...(
        ga4LandingPages.length
          ? ga4LandingPages.map((row) => [
              row.date ?? "",
              row.landing_page ?? "",
              String(row.sessions ?? 0),
            ])
          : [["", "No GA4 landing-page rows found for this range", "0"]]
      ),
    ],
    gscQueries: [
      ["date", "query", "clicks", "impressions", "ctr", "position"],
      ...(
        gscQueries.length
          ? gscQueries.map((row) => [
              row.date ?? "",
              row.query ?? "",
              String(row.clicks ?? 0),
              String(row.impressions ?? 0),
              String(row.ctr ?? 0),
              String(row.position ?? 0),
            ])
          : [["", "No GSC query rows found for this range", "0", "0", "0", "0"]]
      ),
    ],
    gscPages: [
      ["date", "page", "clicks", "impressions", "ctr", "position"],
      ...(
        gscPages.length
          ? gscPages.map((row) => [
              row.date ?? "",
              row.page ?? "",
              String(row.clicks ?? 0),
              String(row.impressions ?? 0),
              String(row.ctr ?? 0),
              String(row.position ?? 0),
            ])
          : [["", "No GSC page rows found for this range", "0", "0", "0", "0"]]
      ),
    ],
    gbpLocations: [
      ["date", "location_name", "location_label", "account_name", "metric", "value"],
      ...(
        gbpLocations.length
          ? gbpLocations.map((row) => [
              row.date ?? "",
              row.location_name ?? "",
              row.location_label ?? "",
              row.account_name ?? "",
              row.metric ?? "",
              String(row.value ?? 0),
            ])
          : [["", "No GBP location rows found for this range", "", "", "", "0"]]
      ),
    ],
    notes: [
      ["note_type", "message"],
      [
        "export_status",
        "This export writes workspace, overview, GA4 source, GA4 landing page, GSC query, GSC page, and GBP location tabs.",
      ],
      [
        "sync_status_hint",
        "If evidence tabs remain empty, save project mapping first and rerun entity sync.",
      ],
    ],
  };
}
