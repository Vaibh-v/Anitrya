import type {
  FutureSourceCard,
  FutureSourceGroup,
  FutureSourceWorkspaceStats,
} from "@/lib/integrations/future-source-contracts";

export function computeFutureSourceWorkspaceStats(
  cards: FutureSourceCard[]
): FutureSourceWorkspaceStats {
  return cards.reduce<FutureSourceWorkspaceStats>(
    (accumulator, card) => {
      if (card.state === "connected") accumulator.connected += 1;
      if (card.state === "available") accumulator.available += 1;
      if (card.state === "preserved") accumulator.preserved += 1;
      if (card.state === "blocked") accumulator.blocked += 1;
      return accumulator;
    },
    {
      connected: 0,
      available: 0,
      preserved: 0,
      blocked: 0,
    }
  );
}

export function flattenFutureSourceGroups(
  groups: FutureSourceGroup[]
): FutureSourceCard[] {
  return groups.flatMap((group) => group.cards);
}