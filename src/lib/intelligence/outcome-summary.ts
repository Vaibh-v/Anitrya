type OutcomeStatus =
  | "accepted"
  | "rejected"
  | "implemented"
  | "improved"
  | "no_impact";

export type RecommendationOutcomeRow = {
  id: string;
  workspace_id: string;
  project_slug: string;
  hypothesis_title: string;
  recommendation_title: string;
  outcome_status: OutcomeStatus;
  outcome_note: string | null;
  impact_delta: number | null;
  created_at: Date;
};

export type OutcomeSummaryCard = {
  label: string;
  value: string;
  context: string;
};

export type OutcomeByStatus = {
  status: OutcomeStatus;
  count: number;
};

export type RecommendationRollup = {
  recommendationTitle: string;
  hypothesisTitle: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  avgImpact: number;
  latestStatus: OutcomeStatus;
  latestCreatedAt: Date | null;
};

export type OutcomeSummary = {
  cards: OutcomeSummaryCard[];
  byStatus: OutcomeByStatus[];
  rollups: RecommendationRollup[];
};

const ORDER: OutcomeStatus[] = [
  "implemented",
  "improved",
  "accepted",
  "no_impact",
  "rejected",
];

function labelFor(status: OutcomeStatus): string {
  if (status === "implemented") return "Implemented";
  if (status === "improved") return "Improved";
  if (status === "accepted") return "Accepted";
  if (status === "no_impact") return "No impact";
  return "Rejected";
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function numeric(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isPositive(status: OutcomeStatus) {
  return status === "implemented" || status === "improved";
}

function isNegative(status: OutcomeStatus) {
  return status === "rejected";
}

export function buildOutcomeSummary(rows: RecommendationOutcomeRow[]): OutcomeSummary {
  const byStatusMap = new Map<OutcomeStatus, number>();
  const rollupMap = new Map<string, RecommendationRollup>();

  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let totalImpact = 0;

  for (const status of ORDER) {
    byStatusMap.set(status, 0);
  }

  for (const row of rows) {
    byStatusMap.set(row.outcome_status, (byStatusMap.get(row.outcome_status) ?? 0) + 1);

    if (isPositive(row.outcome_status)) positive += 1;
    else if (isNegative(row.outcome_status)) negative += 1;
    else neutral += 1;

    totalImpact += numeric(row.impact_delta);

    const key = `${row.hypothesis_title}::${row.recommendation_title}`;
    const current = rollupMap.get(key) ?? {
      recommendationTitle: row.recommendation_title,
      hypothesisTitle: row.hypothesis_title,
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      avgImpact: 0,
      latestStatus: row.outcome_status,
      latestCreatedAt: null,
    };

    current.total += 1;
    if (isPositive(row.outcome_status)) current.positive += 1;
    else if (isNegative(row.outcome_status)) current.negative += 1;
    else current.neutral += 1;

    const impactSum = current.avgImpact * (current.total - 1) + numeric(row.impact_delta);
    current.avgImpact = impactSum / current.total;

    if (!current.latestCreatedAt || row.created_at > current.latestCreatedAt) {
      current.latestCreatedAt = row.created_at;
      current.latestStatus = row.outcome_status;
    }

    rollupMap.set(key, current);
  }

  const byStatus: OutcomeByStatus[] = ORDER.map((status) => ({
    status,
    count: byStatusMap.get(status) ?? 0,
  }));

  const rollups = Array.from(rollupMap.values()).sort((a, b) => {
    if (b.positive !== a.positive) return b.positive - a.positive;
    if (b.total !== a.total) return b.total - a.total;
    return a.recommendationTitle.localeCompare(b.recommendationTitle);
  });

  const latest = rows
    .slice()
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;

  const cards: OutcomeSummaryCard[] = [
    {
      label: "Recorded outcomes",
      value: String(rows.length),
      context: "Recommendation results tracked",
    },
    {
      label: "Positive outcomes",
      value: String(positive),
      context: `${negative} negative · ${neutral} neutral`,
    },
    {
      label: "Avg impact delta",
      value: rows.length > 0 ? totalImpact / rows.length >= 0 ? `+${(totalImpact / rows.length).toFixed(1)}` : (totalImpact / rows.length).toFixed(1) : "0.0",
      context: "Average recorded impact",
    },
    {
      label: "Latest feedback",
      value: latest ? labelFor(latest.outcome_status) : "None",
      context: latest ? formatDate(latest.created_at) : "No recorded outcome yet",
    },
  ];

  return {
    cards,
    byStatus,
    rollups,
  };
}