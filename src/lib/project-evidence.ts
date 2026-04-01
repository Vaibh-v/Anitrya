import {
  EMPTY_EVIDENCE,
  type EvidenceCard,
  type EvidenceCoverage,
  type EvidenceTableRow,
  type ProjectEvidence,
  type TrendPoint,
  type TrendSeries,
} from "@/lib/evidence/types";
import type { DailyPoint, ProjectDataBundle } from "@/lib/intelligence/contracts";

function sum(values: number[]): number {
  return values.reduce((accumulator, current) => accumulator + current, 0);
}

function last<T>(items: T[]): T | null {
  return items.length > 0 ? items[items.length - 1] : null;
}

function previous<T>(items: T[]): T | null {
  return items.length > 1 ? items[items.length - 2] : null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercentFromUnit(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildCoverage(bundle: ProjectDataBundle): EvidenceCoverage {
  return {
    ga4Connected: bundle.connections.some((item) => item.source === "ga4" && item.connected),
    gscConnected: bundle.connections.some((item) => item.source === "gsc" && item.connected),
    hasOverviewData: bundle.ga4Daily.length > 0 || bundle.gscDaily.length > 0,
    hasSeoData:
      bundle.gscDaily.length > 0 ||
      bundle.gscQueries.length > 0 ||
      bundle.gscPages.length > 0,
    hasBehaviorData:
      bundle.ga4Daily.length > 0 ||
      bundle.ga4Landings.length > 0 ||
      bundle.ga4Sources.length > 0,
  };
}

function buildOverviewCards(bundle: ProjectDataBundle): EvidenceCard[] {
  const latestGa4 = last(bundle.ga4Daily);
  const previousGa4 = previous(bundle.ga4Daily);
  const latestGsc = last(bundle.gscDaily);
  const previousGsc = previous(bundle.gscDaily);

  const cards: EvidenceCard[] = [];

  if (latestGa4) {
    const sessionsDelta =
      latestGa4.sessions !== undefined && previousGa4?.sessions !== undefined
        ? latestGa4.sessions - previousGa4.sessions
        : null;

    cards.push({
      id: "sessions",
      label: "Sessions",
      value: formatNumber(latestGa4.sessions ?? 0),
      delta: sessionsDelta === null ? null : `${sessionsDelta >= 0 ? "+" : ""}${formatNumber(sessionsDelta)}`,
      tone: sessionsDelta === null ? "neutral" : sessionsDelta >= 0 ? "positive" : "negative",
      note: latestGa4.date,
    });

    cards.push({
      id: "users",
      label: "Users",
      value: formatNumber(latestGa4.users ?? 0),
      note: latestGa4.date,
    });

    cards.push({
      id: "conversions",
      label: "Conversions",
      value: formatNumber(latestGa4.conversions ?? 0),
      note: latestGa4.date,
    });
  }

  if (latestGsc) {
    const clicksDelta =
      latestGsc.clicks !== undefined && previousGsc?.clicks !== undefined
        ? latestGsc.clicks - previousGsc.clicks
        : null;

    cards.push({
      id: "clicks",
      label: "Search clicks",
      value: formatNumber(latestGsc.clicks ?? 0),
      delta: clicksDelta === null ? null : `${clicksDelta >= 0 ? "+" : ""}${formatNumber(clicksDelta)}`,
      tone: clicksDelta === null ? "neutral" : clicksDelta >= 0 ? "positive" : "negative",
      note: latestGsc.date,
    });
  }

  return cards;
}

function toTrendPoints(rows: DailyPoint[], selectValue: (row: DailyPoint) => number): TrendPoint[] {
  return rows.map((row) => ({
    label: row.date,
    value: selectValue(row),
  }));
}

function buildOverviewTrendSeries(bundle: ProjectDataBundle): TrendSeries[] {
  const series: TrendSeries[] = [];

  if (bundle.ga4Daily.length > 0) {
    series.push({
      id: "ga4-sessions",
      label: "Sessions",
      metric: "GA4 sessions",
      points: toTrendPoints(bundle.ga4Daily, (row) => row.sessions ?? 0),
    });
  }

  if (bundle.gscDaily.length > 0) {
    series.push({
      id: "gsc-clicks",
      label: "Search clicks",
      metric: "GSC clicks",
      points: toTrendPoints(bundle.gscDaily, (row) => row.clicks ?? 0),
    });
  }

  return series;
}

function buildSeoTrendSeries(bundle: ProjectDataBundle): TrendSeries[] {
  const series: TrendSeries[] = [];

  if (bundle.gscDaily.length > 0) {
    series.push({
      id: "gsc-impressions",
      label: "Impressions",
      metric: "GSC impressions",
      points: toTrendPoints(bundle.gscDaily, (row) => row.impressions ?? 0),
    });

    series.push({
      id: "gsc-ctr",
      label: "CTR",
      metric: "GSC CTR",
      points: toTrendPoints(bundle.gscDaily, (row) => row.ctr ?? 0),
    });

    series.push({
      id: "gsc-position",
      label: "Position",
      metric: "GSC average position",
      points: toTrendPoints(bundle.gscDaily, (row) => row.position ?? 0),
    });
  }

  return series;
}

function buildBehaviorTrendSeries(bundle: ProjectDataBundle): TrendSeries[] {
  const series: TrendSeries[] = [];

  if (bundle.ga4Daily.length > 0) {
    series.push({
      id: "ga4-users",
      label: "Users",
      metric: "GA4 users",
      points: toTrendPoints(bundle.ga4Daily, (row) => row.users ?? 0),
    });

    series.push({
      id: "ga4-engagement",
      label: "Engagement rate",
      metric: "GA4 engagement rate",
      points: toTrendPoints(bundle.ga4Daily, (row) => row.engagementRate ?? 0),
    });

    series.push({
      id: "ga4-conversions",
      label: "Conversions",
      metric: "GA4 conversions",
      points: toTrendPoints(bundle.ga4Daily, (row) => row.conversions ?? 0),
    });
  }

  return series;
}

function buildOverviewTable(bundle: ProjectDataBundle): EvidenceTableRow[] {
  const rows: EvidenceTableRow[] = [];
  const latestGa4 = last(bundle.ga4Daily);
  const latestGsc = last(bundle.gscDaily);

  if (latestGa4) {
    rows.push({
      dimension: "Traffic",
      metric: "Sessions",
      value: formatNumber(latestGa4.sessions ?? 0),
      context: latestGa4.date,
    });

    rows.push({
      dimension: "Traffic",
      metric: "Users",
      value: formatNumber(latestGa4.users ?? 0),
      context: latestGa4.date,
    });

    rows.push({
      dimension: "Conversion",
      metric: "Conversions",
      value: formatNumber(latestGa4.conversions ?? 0),
      context: latestGa4.date,
    });
  }

  if (latestGsc) {
    rows.push({
      dimension: "Search",
      metric: "Clicks",
      value: formatNumber(latestGsc.clicks ?? 0),
      context: latestGsc.date,
    });

    rows.push({
      dimension: "Search",
      metric: "Impressions",
      value: formatNumber(latestGsc.impressions ?? 0),
      context: latestGsc.date,
    });
  }

  return rows;
}

function buildSeoTable(bundle: ProjectDataBundle): EvidenceTableRow[] {
  const latest = last(bundle.gscDaily);

  if (!latest) {
    return [];
  }

  const rows: EvidenceTableRow[] = [
    {
      dimension: "Search",
      metric: "Clicks",
      value: formatNumber(latest.clicks ?? 0),
      context: latest.date,
    },
    {
      dimension: "Search",
      metric: "Impressions",
      value: formatNumber(latest.impressions ?? 0),
      context: latest.date,
    },
    {
      dimension: "Search",
      metric: "CTR",
      value: formatPercentFromUnit(latest.ctr ?? 0),
      context: latest.date,
    },
    {
      dimension: "Search",
      metric: "Average position",
      value: `${(latest.position ?? 0).toFixed(1)}`,
      context: latest.date,
    },
  ];

  if (bundle.gscQueries.length > 0) {
    rows.push({
      dimension: "Entity",
      metric: "Top query",
      value: bundle.gscQueries[0].query,
      context: bundle.gscQueries[0].page,
    });
  }

  if (bundle.gscPages.length > 0) {
    rows.push({
      dimension: "Entity",
      metric: "Top page",
      value: bundle.gscPages[0].page,
      context: `${formatNumber(bundle.gscPages[0].clicks)} clicks`,
    });
  }

  return rows;
}

function buildBehaviorTable(bundle: ProjectDataBundle): EvidenceTableRow[] {
  const latest = last(bundle.ga4Daily);

  if (!latest) {
    return [];
  }

  const rows: EvidenceTableRow[] = [
    {
      dimension: "Behavior",
      metric: "Sessions",
      value: formatNumber(latest.sessions ?? 0),
      context: latest.date,
    },
    {
      dimension: "Behavior",
      metric: "Users",
      value: formatNumber(latest.users ?? 0),
      context: latest.date,
    },
    {
      dimension: "Behavior",
      metric: "Conversions",
      value: formatNumber(latest.conversions ?? 0),
      context: latest.date,
    },
    {
      dimension: "Behavior",
      metric: "Engagement rate",
      value: formatPercentFromUnit(latest.engagementRate ?? 0),
      context: latest.date,
    },
  ];

  if (bundle.ga4Landings.length > 0) {
    rows.push({
      dimension: "Entity",
      metric: "Top landing page",
      value: bundle.ga4Landings[0].page,
      context: `${formatNumber(bundle.ga4Landings[0].sessions)} sessions`,
    });
  }

  if (bundle.ga4Sources.length > 0) {
    rows.push({
      dimension: "Entity",
      metric: "Top source / medium",
      value: bundle.ga4Sources[0].sourceMedium,
      context: `${formatNumber(bundle.ga4Sources[0].sessions)} sessions`,
    });
  }

  return rows;
}

export function getProjectEvidence(bundle: ProjectDataBundle): ProjectEvidence {
  const coverage = buildCoverage(bundle);

  if (!coverage.hasOverviewData && !coverage.hasSeoData && !coverage.hasBehaviorData) {
    return {
      ...EMPTY_EVIDENCE,
      coverage,
    };
  }

  return {
    coverage,
    cards: buildOverviewCards(bundle),
    overviewTrendSeries: buildOverviewTrendSeries(bundle),
    seoTrendSeries: buildSeoTrendSeries(bundle),
    behaviorTrendSeries: buildBehaviorTrendSeries(bundle),
    overviewTable: buildOverviewTable(bundle),
    seoTable: buildSeoTable(bundle),
    behaviorTable: buildBehaviorTable(bundle),
    gscQueryRows: bundle.gscQueries,
    gscPageRows: bundle.gscPages,
    ga4LandingRows: bundle.ga4Landings,
    ga4SourceRows: bundle.ga4Sources,
  };
}

export function buildProjectEvidence(bundle: ProjectDataBundle): ProjectEvidence {
  return getProjectEvidence(bundle);
}