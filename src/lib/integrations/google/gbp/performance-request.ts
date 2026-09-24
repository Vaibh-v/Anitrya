const PERFORMANCE_API = "https://businessprofileperformance.googleapis.com/v1";

function appendDate(params: URLSearchParams, kind: "start_date" | "end_date", value: string) {
  const [year, month, day] = value.split("-").map(Number);
  params.set(`dailyRange.${kind}.year`, String(year));
  params.set(`dailyRange.${kind}.month`, String(month));
  params.set(`dailyRange.${kind}.day`, String(day));
}

export function buildGbpPerformanceUrl(input: {
  locationName: string;
  from: string;
  to: string;
  metrics: readonly string[];
}) {
  const locationName = input.locationName.trim().replace(/^locations\//, "");
  const url = new URL(`${PERFORMANCE_API}/locations/${encodeURIComponent(locationName)}:fetchMultiDailyMetricsTimeSeries`);

  for (const metric of input.metrics) {
    url.searchParams.append("dailyMetrics", metric);
  }

  appendDate(url.searchParams, "start_date", input.from);
  appendDate(url.searchParams, "end_date", input.to);
  return url.toString();
}
