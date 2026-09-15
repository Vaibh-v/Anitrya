import type {
  PublicMarketEvidenceCard,
  PublicMarketEvidenceSource,
} from "@/lib/intelligence/public-market-evidence/contracts";
import {
  compilePublicEvidenceCards,
  compilePublicEvidenceSources,
} from "@/lib/intelligence/public-market-evidence/corpus-compiler";
import {
  PUBLIC_EVIDENCE_CORPUS_DOCUMENTS,
  PUBLIC_EVIDENCE_CORPUS_ENTRIES,
} from "@/lib/intelligence/public-market-evidence/seed-corpus";

export const PUBLIC_MARKET_EVIDENCE_SOURCES: PublicMarketEvidenceSource[] =
  compilePublicEvidenceSources(PUBLIC_EVIDENCE_CORPUS_DOCUMENTS);

const compiledEvidenceCards = compilePublicEvidenceCards({
  documents: PUBLIC_EVIDENCE_CORPUS_DOCUMENTS,
  entries: PUBLIC_EVIDENCE_CORPUS_ENTRIES,
});

export const PUBLIC_MARKET_EVIDENCE_CARDS: PublicMarketEvidenceCard[] =
  compiledEvidenceCards.cards;

export const PUBLIC_MARKET_EVIDENCE_COMPILE_RESULT =
  compiledEvidenceCards.result;
