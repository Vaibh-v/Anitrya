/**
 * Pages through the Search Console searchAnalytics API with startRow so large
 * sites are not silently cut off at the first 25,000 rows. Stops at maxRows to
 * keep a single sync inside the serverless time budget.
 */
export type GscApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

const PAGE_SIZE = 25000;

export async function fetchAllGscRows(input: {
  siteUrl: string;
  accessToken: string;
  from: string;
  to: string;
  dimensions: string[];
  label: string;
  maxRows?: number;
}): Promise<GscApiRow[]> {
  const maxRows = input.maxRows ?? 100000;
  const rows: GscApiRow[] = [];

  for (let startRow = 0; startRow < maxRows; startRow += PAGE_SIZE) {
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: input.from,
          endDate: input.to,
          dimensions: input.dimensions,
          rowLimit: PAGE_SIZE,
          startRow,
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as { rows?: GscApiRow[]; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `GSC ${input.label} sync failed for site ${input.siteUrl}.`);
    }

    const page = payload.rows ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}
