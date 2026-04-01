export function buildHypothesisLearningSummary(
  hypotheses: Array<{
    learning?: {
      scoreAdjustment: number;
    };
  }>
) {
  const boosted = hypotheses.filter(
    (item) => (item.learning?.scoreAdjustment ?? 0) > 5
  );
  const penalized = hypotheses.filter(
    (item) => (item.learning?.scoreAdjustment ?? 0) < -5
  );

  return {
    boostedCount: boosted.length,
    penalizedCount: penalized.length,
    summary:
      boosted.length > 0
        ? `${boosted.length} hypotheses are strongly reinforced by historical outcomes.`
        : "No hypotheses are strongly reinforced by historical outcomes yet.",
  };
}