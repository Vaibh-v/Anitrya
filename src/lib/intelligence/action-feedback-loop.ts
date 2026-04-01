export function shouldPromoteAction(action: {
  successRate: number;
  sampleSize: number;
}) {
  return action.successRate > 0.65 && action.sampleSize >= 3;
}

export function shouldDemoteAction(action: {
  failureRate: number;
  sampleSize: number;
}) {
  return action.failureRate > 0.4 && action.sampleSize >= 3;
}

export function learningPriorityBoost(action: {
  successRate: number;
  failureRate: number;
  avgImpact: number;
  sampleSize: number;
}) {
  if (action.sampleSize === 0) return 0;

  return (
    action.successRate * 20 -
    action.failureRate * 12 +
    action.avgImpact * 2 +
    Math.min(action.sampleSize, 10)
  );
}