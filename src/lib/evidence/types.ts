export type ConfidenceLevel = "low" | "medium" | "high";
export type EvidenceTone = "neutral" | "positive" | "negative" | "warning";

export type TrendPoint = {
  label: string;
  value: number;
  secondaryValue?: number | null;
  note?: string | null;
};

export type TrendSeries = {
  id: string;
  label: string;
  metric: string;
  points: TrendPoint[];
};

export type EvidenceCard = {
  id: string;
  label: string;
  value: string;
  delta?: string | null;
  tone?: EvidenceTone;
  note?: string | null;
};

export type EvidenceTableRow = {
  dimension: string;
  metric: string;
  value: string;
  context?: string | null;
};

export type IntelligenceFinding = {
  title: string;
  summary: string;
  evidence: string[];
  confidence: ConfidenceLevel;
  nextSteps: string[];
};

export type DiagnosticsSection = {
  title: string;
  summary: string;
  confidence: ConfidenceLevel;
  actions: string[];
};

export type GSCQueryRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GSCPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GA4LandingRow = {
  page: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

export type GA4SourceRow = {
  sourceMedium: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

export type EvidenceCoverage = {
  ga4Connected: boolean;
  gscConnected: boolean;
  hasOverviewData: boolean;
  hasSeoData: boolean;
  hasBehaviorData: boolean;
};

export type ProjectEvidence = {
  coverage: EvidenceCoverage;
  cards: EvidenceCard[];
  overviewTrendSeries: TrendSeries[];
  seoTrendSeries: TrendSeries[];
  behaviorTrendSeries: TrendSeries[];
  overviewTable: EvidenceTableRow[];
  seoTable: EvidenceTableRow[];
  behaviorTable: EvidenceTableRow[];
  gscQueryRows: GSCQueryRow[];
  gscPageRows: GSCPageRow[];
  ga4LandingRows: GA4LandingRow[];
  ga4SourceRows: GA4SourceRow[];
};

export type ProjectDiagnostics = {
  overview: DiagnosticsSection;
  seo: DiagnosticsSection;
  behavior: DiagnosticsSection;
  crossSource: DiagnosticsSection;
  seoFindings: IntelligenceFinding[];
  behaviorFindings: IntelligenceFinding[];
  crossSourceFindings: IntelligenceFinding[];
};

export type ProjectReference = {
  id?: string;
  slug: string;
  name: string;
  ga4PropertyId?: string | null;
  gscSiteUrl?: string | null;
};

export type ProjectIntelligenceResponse = {
  project: ProjectReference | null;
  evidence: ProjectEvidence;
  diagnostics: ProjectDiagnostics;
};

export const EMPTY_EVIDENCE: ProjectEvidence = {
  coverage: {
    ga4Connected: false,
    gscConnected: false,
    hasOverviewData: false,
    hasSeoData: false,
    hasBehaviorData: false,
  },
  cards: [],
  overviewTrendSeries: [],
  seoTrendSeries: [],
  behaviorTrendSeries: [],
  overviewTable: [],
  seoTable: [],
  behaviorTable: [],
  gscQueryRows: [],
  gscPageRows: [],
  ga4LandingRows: [],
  ga4SourceRows: [],
};

export const EMPTY_DIAGNOSTICS: ProjectDiagnostics = {
  overview: {
    title: "Overview",
    summary: "No evidence is available yet.",
    confidence: "low",
    actions: [],
  },
  seo: {
    title: "SEO",
    summary: "No evidence is available yet.",
    confidence: "low",
    actions: [],
  },
  behavior: {
    title: "Behavior",
    summary: "No evidence is available yet.",
    confidence: "low",
    actions: [],
  },
  crossSource: {
    title: "Cross-source",
    summary: "No evidence is available yet.",
    confidence: "low",
    actions: [],
  },
  seoFindings: [],
  behaviorFindings: [],
  crossSourceFindings: [],
};

export const EMPTY_PROJECT_INTELLIGENCE_RESPONSE: ProjectIntelligenceResponse = {
  project: null,
  evidence: EMPTY_EVIDENCE,
  diagnostics: EMPTY_DIAGNOSTICS,
};