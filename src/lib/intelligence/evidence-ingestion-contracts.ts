export type EvidenceCoverageStatus = "ready" | "partial" | "missing";

export type SyncedEvidenceSnapshot = {
  projectId: string;
  ga4: {
    status: EvidenceCoverageStatus;
    rows: number;
    note: string;
  };
  gsc: {
    status: EvidenceCoverageStatus;
    rows: number;
    note: string;
  };
  behavior: {
    status: EvidenceCoverageStatus;
    rows: number;
    note: string;
  };
};

export type EvidenceDrivenHypothesisSeed = {
  id: string;
  title: string;
  category: "overview" | "seo" | "behavior" | "cross_source";
  score: number;
  summary: string;
  evidence: string[];
  actions: string[];
  nextStep: string;
};