"use client";

import type { FutureSourceCard } from "@/lib/integrations/future-source-contracts";

type Props = {
  card: FutureSourceCard;
};

function buttonText(card: FutureSourceCard): string {
  if (card.actionKind === "oauth_reserved") return "OAuth surface reserved";
  if (card.actionKind === "topic_mapping_reserved") return "Topic mapping reserved";
  return "Provider wiring required";
}

export function FutureSourceActionButton({ card }: Props) {
  return (
    <button
      type="button"
      disabled
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/55"
      aria-disabled="true"
      title="Prepared surface only. Live provider wiring has not been enabled yet."
    >
      {buttonText(card)}
    </button>
  );
}