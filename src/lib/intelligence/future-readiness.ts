import { buildPreservedGbpEvidence } from "./future-evidence/gbp";
import { buildPreservedGoogleAdsEvidence } from "./future-evidence/google-ads";
import { buildPreservedGoogleTrendsEvidence } from "./future-evidence/google-trends";
import type {
  FutureEvidenceBundle,
  FutureEvidenceCoverage,
} from "./future-evidence/contracts";

export type FutureReadinessCard = {
  label: string;
  value: string;
  context: string;
};

export type FutureReadinessPanelData = {
  cards: FutureReadinessCard[];
  rows: FutureEvidenceCoverage[];
};

function buildFutureEvidenceBundle(): FutureEvidenceBundle {
  const gbp = buildPreservedGbpEvidence();
  const ads = buildPreservedGoogleAdsEvidence();
  const trends = buildPreservedGoogleTrendsEvidence();

  return {
    coverage: [gbp.coverage, ads.coverage, trends.coverage],
    gbpLocationRows: gbp.locationRows,
    gbpCategoryRows: gbp.categoryRows,
    adsCampaignRows: ads.campaignRows,
    adsSearchTermRows: ads.searchTermRows,
    trendsTopicRows: trends.topicRows,
    trendsComparisonRows: trends.comparisonRows,
  };
}

export function buildFutureReadinessPanelData(
  bundle?: FutureEvidenceBundle
): FutureReadinessPanelData {
  const resolvedBundle = bundle ?? buildFutureEvidenceBundle();

  const total = resolvedBundle.coverage.length;

  const preserved = resolvedBundle.coverage.filter(
    (row: FutureEvidenceCoverage) => row.state === "preserved"
  ).length;

  const connected = resolvedBundle.coverage.filter(
    (row: FutureEvidenceCoverage) => row.state === "connected"
  ).length;

  const blocked = resolvedBundle.coverage.reduce(
    (count: number, row: FutureEvidenceCoverage) => count + row.blockers.length,
    0
  );

  return {
    cards: [
      {
        label: "Future evidence layers",
        value: String(total),
        context: "Preserved sources ready for implementation",
      },
      {
        label: "Connected now",
        value: String(connected),
        context: "Future-source layers already contributing",
      },
      {
        label: "Preserved next",
        value: String(preserved),
        context: "Sources held in architecture and ready to unlock",
      },
      {
        label: "Known blockers",
        value: String(blocked),
        context: "Visible blockers that still need implementation work",
      },
    ],
    rows: resolvedBundle.coverage,
  };
}