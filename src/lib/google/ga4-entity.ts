import { gaRunReport } from "@/lib/google/ga4";

export type Ga4EntityRow = {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
};

function rowsFromReport(data: any): Ga4EntityRow[] {
  return Array.isArray(data?.rows) ? (data.rows as Ga4EntityRow[]) : [];
}

export async function gaLandingPageRows(
  accessToken: string,
  propertyId: string,
  params: {
    startDate: string;
    endDate: string;
    limit?: number;
  }
): Promise<Ga4EntityRow[]> {
  const report = await gaRunReport(accessToken, propertyId, {
    dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
    dimensions: [{ name: "landingPagePlusQueryString" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "conversions" },
      { name: "engagementRate" },
    ],
    limit: String(params.limit ?? 1000),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return rowsFromReport(report);
}

export async function gaSourceMediumRows(
  accessToken: string,
  propertyId: string,
  params: {
    startDate: string;
    endDate: string;
    limit?: number;
  }
): Promise<Ga4EntityRow[]> {
  const report = await gaRunReport(accessToken, propertyId, {
    dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
    dimensions: [{ name: "sessionSourceMedium" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "conversions" },
      { name: "engagementRate" },
    ],
    limit: String(params.limit ?? 250),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return rowsFromReport(report);
}