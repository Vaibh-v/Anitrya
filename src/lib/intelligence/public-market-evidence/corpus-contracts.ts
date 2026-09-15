import type {
  PublicEvidenceApplicability,
  PublicEvidenceClass,
  PublicEvidenceSourceKind,
} from "@/lib/intelligence/public-market-evidence/contracts";

export type PublicEvidenceCorpusDocument = {
  documentId: string;
  title: string;
  publisher: string;
  sourceKind: PublicEvidenceSourceKind;
  publicationYear: number;
  sourceUrl: string;
  accessMode: "open" | "gated" | "paid" | "api";
  reliability: "low" | "medium" | "high";
  storage: {
    provider: "seed" | "google_drive" | "external_url";
    folderPath?: string;
    fileName?: string;
    fileId?: string;
    mimeType?: string;
  };
  notes: string;
};

export type PublicEvidenceCorpusEntry = {
  entryId: string;
  documentId: string;
  industry: string;
  subIndustry?: string;
  region: string;
  year: number;
  topic: string;
  evidenceClass: PublicEvidenceClass;
  applicability: PublicEvidenceApplicability[];
  claim: string;
  reasoningUse: string;
  confidence: number;
  extraction: {
    method: "manual_seed" | "manual_review" | "parser" | "api";
    locator?: string;
    extractedAt?: string;
  };
};

export type PublicEvidenceCorpusCompileWarning = {
  entryId: string;
  reason: string;
};

export type PublicEvidenceCorpusCompileResult = {
  warnings: PublicEvidenceCorpusCompileWarning[];
  skippedEntries: number;
};
