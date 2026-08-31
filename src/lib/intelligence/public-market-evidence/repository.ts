import type {
  PublicMarketEvidenceBundle,
  PublicMarketEvidenceCard,
  PublicMarketEvidenceQuery,
} from "@/lib/intelligence/public-market-evidence/contracts";
import {
  PUBLIC_MARKET_EVIDENCE_CARDS,
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

function buildCoverage(cards: PublicMarketEvidenceCard[]) {
  const confidenceAverage =
    cards.length > 0
      ? cards.reduce((total, card) => total + card.confidence, 0) / cards.length
      : 0;

  return {
    totalCards: PUBLIC_MARKET_EVIDENCE_CARDS.length,
    matchedCards: cards.length,
    industries: [...new Set(cards.map((card) => card.industry))],
    topics: [...new Set(cards.map((card) => card.topic))],
    confidenceAverage: Math.round(confidenceAverage * 100) / 100,
  };
}

export async function getPublicMarketEvidenceBundle(
  query: PublicMarketEvidenceQuery,
): Promise<PublicMarketEvidenceBundle> {
  const limit = Math.max(1, Math.min(query.limit ?? 5, 12));
  const rankedCards = [...PUBLIC_MARKET_EVIDENCE_CARDS]
    .map((card) => ({ card, score: scoreCard(card, query) }))
    .sort((a, b) => b.score - a.score || b.card.confidence - a.card.confidence)
    .slice(0, limit)
    .map((entry) => entry.card);

  const sourceIds = new Set(rankedCards.map((card) => card.sourceId));
  const sources = PUBLIC_MARKET_EVIDENCE_SOURCES.filter((source) =>
    sourceIds.has(source.sourceId),
  );

  return {
    sources,
    cards: rankedCards,
    coverage: buildCoverage(rankedCards),
  };
}
