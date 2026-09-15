import type {
  PublicMarketEvidenceBundle,
  PublicMarketEvidenceCard,
  PublicMarketEvidenceSource,
  PublicMarketEvidenceQuery,
} from "@/lib/intelligence/public-market-evidence/contracts";
import type { PublicEvidenceCorpusCompiled } from "@/lib/intelligence/public-market-evidence/corpus-contracts";
import {
  PUBLIC_MARKET_EVIDENCE_CARDS,
  PUBLIC_MARKET_EVIDENCE_COMPILE_RESULT,
  PUBLIC_MARKET_EVIDENCE_SOURCES,
} from "@/lib/intelligence/public-market-evidence/source-catalog";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return new Set(normalize(value).split(/\s+/).filter(Boolean));
}

function hasOverlap(left: Set<string>, right: Set<string>) {
  for (const token of left) {
    if (right.has(token)) return true;
  }
  return false;
}

function scoreCard(card: PublicMarketEvidenceCard, query: PublicMarketEvidenceQuery) {
  const projectTokens = tokenize(`${query.projectLabel} ${query.projectSlug}`);
  const topicTokens = tokenize([card.topic, card.claim, card.reasoningUse].join(" "));
  const requestedTopics = tokenize((query.topics ?? []).join(" "));
  const requestedIndustry = normalize(query.industry ?? "");
  const requestedRegion = normalize(query.region ?? "");

  let score = card.confidence * 10;

  if (card.industry === "cross_industry") score += 4;
  if (requestedIndustry && normalize(card.industry).includes(requestedIndustry)) {
    score += 8;
  }
  if (requestedRegion && normalize(card.region).includes(requestedRegion)) {
    score += 4;
  }
  if (hasOverlap(projectTokens, topicTokens)) score += 3;
  if (requestedTopics.size > 0 && hasOverlap(requestedTopics, topicTokens)) {
    score += 6;
  }

  return score;
}

function buildCoverage(input: {
  matchedCards: PublicMarketEvidenceCard[];
  totalCards: number;
  skippedEntries: number;
  warnings: string[];
}) {
  const { matchedCards, totalCards, skippedEntries, warnings } = input;
  const confidenceAverage =
    matchedCards.length > 0
      ? matchedCards.reduce((total, card) => total + card.confidence, 0) /
        matchedCards.length
      : 0;

  return {
    totalCards,
    matchedCards: matchedCards.length,
    industries: [...new Set(matchedCards.map((card) => card.industry))],
    topics: [...new Set(matchedCards.map((card) => card.topic))],
    confidenceAverage: Math.round(confidenceAverage * 100) / 100,
    skippedEntries,
    warnings,
  };
}

function buildBundleFromCards(input: {
  query: PublicMarketEvidenceQuery;
  cards: PublicMarketEvidenceCard[];
  sources: PublicMarketEvidenceSource[];
  skippedEntries: number;
  warnings: string[];
}): PublicMarketEvidenceBundle {
  const { query, cards, sources, skippedEntries, warnings } = input;
  const limit = Math.max(1, Math.min(query.limit ?? 5, 12));
  const rankedCards = [...cards]
    .map((card) => ({ card, score: scoreCard(card, query) }))
    .sort((a, b) => b.score - a.score || b.card.confidence - a.card.confidence)
    .slice(0, limit)
    .map((entry) => entry.card);

  const sourceIds = new Set(rankedCards.map((card) => card.sourceId));
  const rankedSources = sources.filter((source) => sourceIds.has(source.sourceId));

  return {
    sources: rankedSources,
    cards: rankedCards,
    coverage: buildCoverage({
      matchedCards: rankedCards,
      totalCards: cards.length,
      skippedEntries,
      warnings,
    }),
  };
}

export async function getPublicMarketEvidenceBundle(
  query: PublicMarketEvidenceQuery,
): Promise<PublicMarketEvidenceBundle> {
  return buildBundleFromCards({
    query,
    cards: PUBLIC_MARKET_EVIDENCE_CARDS,
    sources: PUBLIC_MARKET_EVIDENCE_SOURCES,
    skippedEntries: PUBLIC_MARKET_EVIDENCE_COMPILE_RESULT.skippedEntries,
    warnings: PUBLIC_MARKET_EVIDENCE_COMPILE_RESULT.warnings.map(
      (warning) => `${warning.entryId}: ${warning.reason}`,
    ),
  });
}

export async function getPublicMarketEvidenceBundleFromCorpus(input: {
  query: PublicMarketEvidenceQuery;
  corpus: PublicEvidenceCorpusCompiled;
}): Promise<PublicMarketEvidenceBundle> {
  return buildBundleFromCards({
    query: input.query,
    cards: input.corpus.cards,
    sources: input.corpus.sources,
    skippedEntries: input.corpus.result.skippedEntries,
    warnings: input.corpus.result.warnings.map(
      (warning) => `${warning.entryId}: ${warning.reason}`,
    ),
  });
}
