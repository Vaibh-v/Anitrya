import type {
  PublicMarketEvidenceCard,
  PublicMarketEvidenceSource,
} from "@/lib/intelligence/public-market-evidence/contracts";
import type {
  PublicEvidenceCorpusCompileResult,
  PublicEvidenceCorpusDocument,
  PublicEvidenceCorpusEntry,
} from "@/lib/intelligence/public-market-evidence/corpus-contracts";

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function compilePublicEvidenceSources(
  documents: PublicEvidenceCorpusDocument[],
): PublicMarketEvidenceSource[] {
  return documents.map((document) => ({
    sourceId: document.documentId,
    title: document.title,
    publisher: document.publisher,
    sourceKind: document.sourceKind,
    publicationYear: document.publicationYear,
    sourceUrl: document.sourceUrl,
    accessMode: document.accessMode,
    reliability: document.reliability,
    notes: document.notes,
  }));
}

export function compilePublicEvidenceCards(input: {
  documents: PublicEvidenceCorpusDocument[];
  entries: PublicEvidenceCorpusEntry[];
}): {
  cards: PublicMarketEvidenceCard[];
  result: PublicEvidenceCorpusCompileResult;
} {
  const documentById = new Map(
    input.documents.map((document) => [document.documentId, document]),
  );
  const warnings: PublicEvidenceCorpusCompileResult["warnings"] = [];
  const cards: PublicMarketEvidenceCard[] = [];

  for (const entry of input.entries) {
    const document = documentById.get(entry.documentId);

    if (!document) {
      warnings.push({
        entryId: entry.entryId,
        reason: `Missing corpus document: ${entry.documentId}`,
      });
      continue;
    }

    cards.push({
      evidenceId: entry.entryId,
      sourceId: entry.documentId,
      sourceTitle: document.title,
      sourcePublisher: document.publisher,
      sourceReliability: document.reliability,
      industry: entry.industry,
      subIndustry: entry.subIndustry,
      region: entry.region,
      year: entry.year,
      topic: entry.topic,
      evidenceClass: entry.evidenceClass,
      applicability: entry.applicability,
      claim: entry.claim,
      reasoningUse: entry.reasoningUse,
      confidence: clampConfidence(entry.confidence),
      sourceUrl: document.sourceUrl,
    });
  }

  return {
    cards,
    result: {
      warnings,
      skippedEntries: warnings.length,
    },
  };
}
