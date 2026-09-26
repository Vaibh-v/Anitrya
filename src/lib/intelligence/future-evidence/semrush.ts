/**
 * SEMrush -> intelligence evidence-input contract (pure, no I/O).
 *
 * This is ONLY an adapter: it reshapes normalized SEMrush rows into a stable,
 * typed input the intelligence layer can consume later. It performs no
 * reasoning, scoring or recommendation generation, and it is not wired into
 * run-intelligence yet. Server-side loading lives in ./semrush-loader.ts.
 */
import type {
  SemrushAvailability,
  SemrushConfidence,
  SemrushDomainMetric,
  SemrushEvidenceRow,
} from "@/lib/integrations/semrush/semrush-evidence-contract";

export type SemrushEvidenceState = "missing" | "connected";

export type SemrushDomainMetricInput = {
  metric: SemrushDomainMetric;
  value: number;
  confidence: SemrushConfidence;
  isEstimate: boolean;
};

export type SemrushKeywordEvidenceInput = {
  keyword: string;
  pageUrl: string | null;
  position: number | null;
  previousPosition: number | null;
  /** previous - current; positive = improved. Null when either side missing. */
  positionChange: number | null;
  searchVolume: number | null;
  cpc: number | null;
  trafficPercent: number | null;
  trafficCostPercent: number | null;
  competition: number | null;
  /** Lowest confidence among the metrics present for this keyword. */
  confidence: SemrushConfidence;
};

export type SemrushEvidenceCoverage = {
  source: "semrush";
  state: SemrushEvidenceState;
  domain: string | null;
  databaseCode: string | null;
  snapshotDate: string | null;
  fetchedAt: string | null;
  /** "partial" when the keyword report was a truncated top-N sample. */
  availability: SemrushAvailability | "none";
  keywordCount: number;
  metricsAvailable: string[];
  /** Caveats the reasoning layer must carry into any claim it makes. */
  caveats: string[];
};

export type SemrushIntelligenceEvidence = {
  coverage: SemrushEvidenceCoverage;
  domainMetrics: SemrushDomainMetricInput[];
  keywordRows: SemrushKeywordEvidenceInput[];
  /** Short, factual, citation-style lines. No interpretation. */
  evidenceLines: string[];
};

const CONFIDENCE_RANK: Record<SemrushConfidence, number> = { low: 0, medium: 1, high: 2 };

function minConfidence(values: SemrushConfidence[]): SemrushConfidence {
  if (values.length === 0) return "low";
  return values.reduce((lowest, value) =>
    CONFIDENCE_RANK[value] < CONFIDENCE_RANK[lowest] ? value : lowest,
  );
}

export function emptySemrushIntelligenceEvidence(): SemrushIntelligenceEvidence {
  return {
    coverage: {
      source: "semrush",
      state: "missing",
      domain: null,
      databaseCode: null,
      snapshotDate: null,
      fetchedAt: null,
      availability: "none",
      keywordCount: 0,
      metricsAvailable: [],
      caveats: ["No SEMrush evidence is stored for this project and window."],
    },
    domainMetrics: [],
    keywordRows: [],
    evidenceLines: [],
  };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toFixed(2);
}

export function buildSemrushIntelligenceEvidence(
  rows: SemrushEvidenceRow[],
): SemrushIntelligenceEvidence {
  if (rows.length === 0) return emptySemrushIntelligenceEvidence();

  const first = rows[0] as SemrushEvidenceRow;
  const domainMetrics: SemrushDomainMetricInput[] = [];
  const keywordMap = new Map<string, SemrushKeywordEvidenceInput & { _conf: SemrushConfidence[] }>();
  const metrics = new Set<string>();
  let partial = false;

  for (const row of rows) {
    if (row.value == null) continue;
    metrics.add(row.metric);
    if (row.availability === "partial") partial = true;

    if (row.entityType === "domain") {
      domainMetrics.push({
        metric: row.metric as SemrushDomainMetric,
        value: row.value,
        confidence: row.confidence,
        isEstimate: row.isEstimate,
      });
      continue;
    }

    if (!row.keyword) continue;
    const key = `${row.keyword}\u0000${row.pageUrl ?? ""}`;
    const entry =
      keywordMap.get(key) ??
      {
        keyword: row.keyword,
        pageUrl: row.pageUrl,
        position: null,
        previousPosition: null,
        positionChange: null,
        searchVolume: null,
        cpc: null,
        trafficPercent: null,
        trafficCostPercent: null,
        competition: null,
        confidence: "low" as SemrushConfidence,
        _conf: [],
      };

    entry._conf.push(row.confidence);

    switch (row.metric) {
      case "position": entry.position = row.value; break;
      case "previous_position": entry.previousPosition = row.value; break;
      case "search_volume": entry.searchVolume = row.value; break;
      case "cpc": entry.cpc = row.value; break;
      case "traffic_percent": entry.trafficPercent = row.value; break;
      case "traffic_cost_percent": entry.trafficCostPercent = row.value; break;
      case "competition": entry.competition = row.value; break;
      default: break;
    }

    keywordMap.set(key, entry);
  }

  const keywordRows: SemrushKeywordEvidenceInput[] = Array.from(keywordMap.values())
    .map(({ _conf, ...entry }) => ({
      ...entry,
      // SEMrush reports previous position 0 when the keyword was not ranking.
      positionChange:
        entry.position != null && entry.previousPosition != null && entry.previousPosition > 0
          ? entry.previousPosition - entry.position
          : null,
      confidence: minConfidence(_conf),
    }))
    .sort((a, b) => (b.trafficPercent ?? -1) - (a.trafficPercent ?? -1));

  const caveats = [
    "SEMrush values are third-party modelled estimates from a market snapshot, not first-party measurements.",
    `Snapshot date ${first.date}; it represents SEMrush's database at fetch time, not daily values across the window.`,
  ];
  if (partial) {
    caveats.push("Keyword evidence is a truncated top-N sample sorted by estimated traffic share.");
  }

  const evidenceLines: string[] = domainMetrics.map(
    (metric) =>
      `SEMrush ${first.databaseCode} ${first.date}: ${metric.metric.replace(/_/g, " ")} = ${formatNumber(metric.value)} (${metric.confidence} confidence${metric.isEstimate ? ", estimate" : ""})`,
  );
  if (keywordRows.length > 0) {
    evidenceLines.push(
      `SEMrush ${first.databaseCode} ${first.date}: ${keywordRows.length} ranking keyword(s) captured for ${first.domain}${partial ? " (top-N sample)" : ""}.`,
    );
  }

  return {
    coverage: {
      source: "semrush",
      state: "connected",
      domain: first.domain,
      databaseCode: first.databaseCode,
      snapshotDate: first.date,
      fetchedAt: first.fetchedAt,
      availability: partial ? "partial" : "available",
      keywordCount: keywordRows.length,
      metricsAvailable: Array.from(metrics).sort(),
      caveats,
    },
    domainMetrics,
    keywordRows,
    evidenceLines,
  };
}
