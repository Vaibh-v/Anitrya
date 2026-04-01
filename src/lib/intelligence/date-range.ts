import type { DateRangePreset, ResolvedDateRange } from "@/lib/intelligence/contracts";

type DateRangeInput = {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function fromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function diffDaysInclusive(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function presetDays(preset: DateRangePreset): number {
  switch (preset) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "180d":
      return 180;
    case "365d":
      return 365;
    case "custom":
      return 30;
  }
}

function presetLabel(preset: DateRangePreset): string {
  switch (preset) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "180d":
      return "Last 180 days";
    case "365d":
      return "Last 365 days";
    case "custom":
      return "Custom range";
  }
}

export function resolveDateRange(input?: DateRangeInput): ResolvedDateRange {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const rawPreset = input?.preset;
  const preset: DateRangePreset =
    rawPreset === "7d" ||
    rawPreset === "30d" ||
    rawPreset === "90d" ||
    rawPreset === "180d" ||
    rawPreset === "365d" ||
    rawPreset === "custom"
      ? rawPreset
      : "30d";

  if (preset === "custom") {
    const parsedFrom = input?.from ? fromIsoDate(input.from) : null;
    const parsedTo = input?.to ? fromIsoDate(input.to) : null;

    if (parsedFrom && parsedTo && parsedFrom.getTime() <= parsedTo.getTime()) {
      return {
        preset: "custom",
        from: toIsoDate(parsedFrom),
        to: toIsoDate(parsedTo),
        label: "Custom range",
        days: diffDaysInclusive(parsedFrom, parsedTo),
      };
    }
  }

  const days = presetDays(preset);
  const to = todayUtc;
  const from = addDays(to, -(days - 1));

  return {
    preset,
    from: toIsoDate(from),
    to: toIsoDate(to),
    label: presetLabel(preset),
    days,
  };
}

export function rangeQueryParams(range: ResolvedDateRange): Record<string, string> {
  if (range.preset === "custom") {
    return {
      preset: "custom",
      from: range.from,
      to: range.to,
    };
  }

  return {
    preset: range.preset,
  };
}