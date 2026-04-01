import type {
  FutureSourceCategory,
  FutureSourceSignal,
} from "@/lib/intelligence/future-sources";

export type FutureSourceSummaryCard = {
  label: string;
  value: string;
  context: string;
};

export type FutureSourceCategoryBlock = {
  category: FutureSourceCategory;
  total: number;
  connected: number;
  preserved: number;
  planned: number;
  topLabels: string[];
};

export type FutureSourceSummary = {
  cards: FutureSourceSummaryCard[];
  categories: FutureSourceCategoryBlock[];
};

const ORDERED_CATEGORIES: FutureSourceCategory[] = ["core", "expansion", "market"];

export function buildFutureSourceSummary(
  signals: FutureSourceSignal[]
): FutureSourceSummary {
  const cards: FutureSourceSummaryCard[] = [
    {
      label: "Total source surfaces",
      value: String(signals.length),
      context: "Current + preserved evidence layers",
    },
    {
      label: "Connected now",
      value: String(signals.filter((item) => item.state === "connected").length),
      context: "Live evidence layers currently contributing",
    },
    {
      label: "Preserved next",
      value: String(signals.filter((item) => item.state === "preserved").length),
      context: "Ready for future implementation without contract drift",
    },
    {
      label: "Market-context layers",
      value: String(signals.filter((item) => item.category === "market").length),
      context: "External demand and competitor-context sources",
    },
  ];

  const categories: FutureSourceCategoryBlock[] = ORDERED_CATEGORIES.map((category) => {
    const rows = signals.filter((item) => item.category === category);

    return {
      category,
      total: rows.length,
      connected: rows.filter((item) => item.state === "connected").length,
      preserved: rows.filter((item) => item.state === "preserved").length,
      planned: rows.filter((item) => item.state === "planned").length,
      topLabels: rows.map((item) => item.label),
    };
  });

  return {
    cards,
    categories,
  };
}