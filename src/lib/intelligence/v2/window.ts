/** Selected window and the previous window of equal length (pure, no DB). */
export type Window = { from: string; to: string; prevFrom: string; prevTo: string; days: number };

export function buildWindow(from: string, to: string): Window {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const prevTo = new Date(start);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - days + 1);
  return { from, to, prevFrom: iso(prevFrom), prevTo: iso(prevTo), days };
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}
