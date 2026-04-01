import type { Direction, MetricDelta } from "@/lib/evidence/types";

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function avg(values: number[]) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function safePercentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function getDirection(percentChange: number | null): Direction {
  if (percentChange === null) return "flat";
  if (percentChange > 0.2) return "up";
  if (percentChange < -0.2) return "down";
  return "flat";
}

export function buildDelta(current: number, previous: number): MetricDelta {
  const absoluteChange = current - previous;
  const percentChange = safePercentChange(current, previous);

  return {
    current,
    previous,
    absoluteChange,
    percentChange,
    direction: getDirection(percentChange)
  };
}

export function asPercentUnit(value: number) {
  return round(value * 100, 1);
}

export function asDecimal(value: number, digits = 3) {
  return round(value, digits);
}