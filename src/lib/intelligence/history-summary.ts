import type { ConfidenceLevel } from "@/lib/evidence/types";
import type { IntelligenceHistoryRow } from "@/lib/intelligence/history-store";

export type HistorySummaryCard = {
  label: string;
  value: string;
  context: string;
};

export type HistoryCategoryRollup = {
  category: string;
  count: number;
  high: number;
  medium: number;
  low: number;
  latestTitle: string;
  latestSummary: string;
  latestCreatedAt: Date | null;
};

export type HistoryTimelinePoint = {
  date: string;
  total: number;
  high: number;
  medium: number;
  low: number;
};

export type HistorySummary = {
  cards: HistorySummaryCard[];
  categories: HistoryCategoryRollup[];
  timeline: HistoryTimelinePoint[];
};

function normalizeConfidence(value: string): ConfidenceLevel {
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function formatShortDate(value: Date | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

export function buildHistorySummary(rows: IntelligenceHistoryRow[]): HistorySummary {
  const categoryMap = new Map<string, HistoryCategoryRollup>();
  const timelineMap = new Map<string, HistoryTimelinePoint>();

  let high = 0;
  let medium = 0;
  let low = 0;

  for (const row of rows) {
    const confidence = normalizeConfidence(row.confidence);

    if (confidence === "high") high += 1;
    if (confidence === "medium") medium += 1;
    if (confidence === "low") low += 1;

    const current = categoryMap.get(row.category) ?? {
      category: row.category,
      count: 0,
      high: 0,
      medium: 0,
      low: 0,
      latestTitle: "",
      latestSummary: "",
      latestCreatedAt: null,
    };

    current.count += 1;
    if (confidence === "high") current.high += 1;
    if (confidence === "medium") current.medium += 1;
    if (confidence === "low") current.low += 1;

    if (!current.latestCreatedAt || row.created_at > current.latestCreatedAt) {
      current.latestTitle = row.title;
      current.latestSummary = row.summary;
      current.latestCreatedAt = row.created_at;
    }

    categoryMap.set(row.category, current);

    const dateKey = row.created_at.toISOString().slice(0, 10);
    const day = timelineMap.get(dateKey) ?? {
      date: dateKey,
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    day.total += 1;
    if (confidence === "high") day.high += 1;
    if (confidence === "medium") day.medium += 1;
    if (confidence === "low") day.low += 1;

    timelineMap.set(dateKey, day);
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.category.localeCompare(b.category);
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const latest = rows
    .slice()
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;

  const cards: HistorySummaryCard[] = [
    {
      label: "Memory entries",
      value: String(rows.length),
      context: "Persisted intelligence snapshots",
    },
    {
      label: "High-confidence reads",
      value: String(high),
      context: `${medium} medium · ${low} low`,
    },
    {
      label: "Tracked categories",
      value: String(categories.length),
      context: categories.map((item) => item.category).join(", ") || "No categories yet",
    },
    {
      label: "Latest memory write",
      value: formatShortDate(latest?.created_at ?? null),
      context: latest?.title ?? "No recent memory entry",
    },
  ];

  return {
    cards,
    categories,
    timeline,
  };
}