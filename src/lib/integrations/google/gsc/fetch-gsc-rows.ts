/**
 * Reads Search Console searchAnalytics rows for a range without truncation bias.
 * The API sorts by clicks, so one request over a long range fills its row cap
 * with the busiest days' rows and drops the long tail of recent ones. We split
 * the range into 7-day windows and page each window with startRow, capped per
 * window to stay inside the serverless time budget.
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
  maxRowsPerWindow?: number;
}): Promise<GscApiRow[]> {
  const rows: GscApiRow[] = [];
  for (const window of splitRange(input.from, input.to, 7)) {
    rows.push(...(await fetchWindow({ ...input, from: window.from, to: window.to })));
  }
  return rows;
}

function splitRange(from: string, to: string, days: number): Array<{ from: string; to: string }> {
  const windows: Array<{ from: string; to: string }> = [];
  const end = new Date(`${to}T00:00:00Z`);
  let cursor = new Date(`${from}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return [{ from, to }];
  while (cursor <= end) {
    const windowEnd = new Date(cursor);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + days - 1);
    const clipped = windowEnd > end ? end : windowEnd;
    windows.push({ from: cursor.toISOString().slice(0, 10), to: clipped.toISOString().slice(0, 10) });
    cursor = new Date(clipped);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return windows;
}

async function fetchWindow(input: {
  siteUrl: string;
  accessToken: string;
  from: string;
  to: string;
  dimensions: string[];
  label: string;
  maxRowsPerWindow?: number;
}): Promise<GscApiRow[]> {
  const maxRows = input.maxRowsPerWindow ?? 50000;
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
