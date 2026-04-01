type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" ? (value as AnyRecord) : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export type OverviewMetricCard = {
  key: string;
  label: string;
  value: string;
  delta?: string;
  context?: string;
};

export type OverviewTrendPoint = {
  date: string;
  value: number;
};

export type OverviewTrendBlock = {
  key: string;
  title: string;
  subtitle: string;
  points: OverviewTrendPoint[];
};

export type OverviewEvidenceRow = {
  dimension: string;
  metric: string;
  value: string;
  context: string;
};

export type SafeOverviewEvidence = {
  cards: OverviewMetricCard[];
  trends: OverviewTrendBlock[];
  tableRows: OverviewEvidenceRow[];
};

function normalizeMetricCard(value: unknown, fallbackKey: string): OverviewMetricCard | null {
  const row = asRecord(value);
  if (!row) return null;

  const label =
    asString(row.label) ||
    asString(row.title) ||
    asString(row.metric) ||
    fallbackKey;

  const metricValue =
    asString(row.value) ||
    asString(row.metricValue) ||
    asString(row.total) ||
    asString(row.amount);

  if (!label || !metricValue) return null;

  return {
    key: asString(row.key) || fallbackKey,
    label,
    value: metricValue,
    delta: asString(row.delta) || asString(row.change) || undefined,
    context: asString(row.context) || asString(row.subtitle) || undefined,
  };
}

function normalizeTrendPoint(value: unknown): OverviewTrendPoint | null {
  const row = asRecord(value);
  if (!row) return null;

  const date =
    asString(row.date) ||
    asString(row.label) ||
    asString(row.day);

  if (!date) return null;

  return {
    date,
    value:
      asNumber(row.value) ||
      asNumber(row.metricValue) ||
      asNumber(row.count) ||
      asNumber(row.total),
  };
}

function normalizeTrendBlock(
  title: string,
  subtitle: string,
  value: unknown,
  fallbackKey: string
): OverviewTrendBlock {
  const rawPoints = asArray(value).map(normalizeTrendPoint).filter(Boolean) as OverviewTrendPoint[];

  return {
    key: fallbackKey,
    title,
    subtitle,
    points: rawPoints,
  };
}

function normalizeEvidenceRow(value: unknown): OverviewEvidenceRow | null {
  const row = asRecord(value);
  if (!row) return null;

  const dimension = asString(row.dimension) || asString(row.group) || "Overview";
  const metric = asString(row.metric) || asString(row.label);
  const metricValue =
    asString(row.value) ||
    asString(row.metricValue) ||
    asString(row.total);
  const context =
    asString(row.context) ||
    asString(row.date) ||
    asString(row.period);

  if (!metric || !metricValue) return null;

  return {
    dimension,
    metric,
    value: metricValue,
    context,
  };
}

export function extractSafeOverviewEvidence(intelligence: unknown): SafeOverviewEvidence {
  const root = asRecord(intelligence);
  const evidence = asRecord(root?.evidence);

  const cardsCandidates = [
    evidence?.cards,
    evidence?.overviewCards,
    evidence?.metricCards,
  ];

  let cards: OverviewMetricCard[] = [];
  for (const candidate of cardsCandidates) {
    const next = asArray(candidate)
      .map((item, index) => normalizeMetricCard(item, `card-${index + 1}`))
      .filter(Boolean) as OverviewMetricCard[];

    if (next.length > 0) {
      cards = next;
      break;
    }
  }

  const overviewTrendSource =
    evidence?.overviewTrendSeries ??
    evidence?.overviewTrend ??
    evidence?.trafficTrend ??
    [];

  const seoTrendSource =
    evidence?.seoTrendSeries ??
    evidence?.seoTrend ??
    evidence?.searchTrend ??
    [];

  const behaviorTrendSource =
    evidence?.behaviorTrendSeries ??
    evidence?.behaviorTrend ??
    evidence?.engagementTrend ??
    [];

  const trends: OverviewTrendBlock[] = [
    normalizeTrendBlock(
      "Overview trend",
      "Top-level project movement over the selected window.",
      overviewTrendSource,
      "overview"
    ),
    normalizeTrendBlock(
      "SEO trend",
      "Search movement over the selected window.",
      seoTrendSource,
      "seo"
    ),
    normalizeTrendBlock(
      "Behavior trend",
      "Behavior movement over the selected window.",
      behaviorTrendSource,
      "behavior"
    ),
  ];

  const tableCandidates = [
    evidence?.overviewTableRows,
    evidence?.overviewTable,
    evidence?.tableRows,
  ];

  let tableRows: OverviewEvidenceRow[] = [];
  for (const candidate of tableCandidates) {
    const next = asArray(candidate)
      .map(normalizeEvidenceRow)
      .filter(Boolean) as OverviewEvidenceRow[];

    if (next.length > 0) {
      tableRows = next;
      break;
    }
  }

  return {
    cards,
    trends,
    tableRows,
  };
}