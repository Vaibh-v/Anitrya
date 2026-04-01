import type {
  OverviewEvidenceRow,
  OverviewMetricCard,
  OverviewTrendBlock,
} from "@/lib/intelligence/overview-safe";

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildFallbackOverviewCards(
  rows: OverviewEvidenceRow[]
): OverviewMetricCard[] {
  const selected = rows.slice(0, 4);

  return selected.map((row, index) => ({
    key: `fallback-card-${index + 1}`,
    label: titleCase(row.metric),
    value: row.value,
    context: row.context || row.dimension,
  }));
}

export function ensureOverviewCards(
  cards: OverviewMetricCard[],
  rows: OverviewEvidenceRow[]
): OverviewMetricCard[] {
  if (cards.length > 0) return cards;
  return buildFallbackOverviewCards(rows);
}

export function ensureOverviewTrends(
  trends: OverviewTrendBlock[]
): OverviewTrendBlock[] {
  return trends.map((trend) => ({
    ...trend,
    points: Array.isArray(trend.points) ? trend.points : [],
  }));
}