import type { ProviderStateSummaryCard } from "@/lib/integrations/provider-state-contracts";

type ProviderLike = {
  provider?: string | null;
  providerId?: string | null;
  key?: string | null;
  connected?: boolean | null;
  status?: string | null;
  readiness?: string | null;
  note?: string | null;
  scope?: string | null;
  updatedAt?: string | Date | null;
};

function providerKey(record: ProviderLike): string {
  return (
    record.key?.trim() ||
    record.providerId?.trim() ||
    record.provider?.trim() ||
    "unknown_provider"
  );
}

function providerLabel(key: string): string {
  if (key === "google_ga4" || key === "GOOGLE_GA4") return "Google Analytics 4";
  if (key === "google_gsc" || key === "GOOGLE_GSC") return "Google Search Console";
  if (key === "google_gbp" || key === "GOOGLE_GBP") return "Google Business Profile";
  if (key === "google_ads" || key === "GOOGLE_ADS") return "Google Ads";
  if (key === "google_trends" || key === "GOOGLE_TRENDS") return "Google Trends";
  return key;
}

function asIsoString(value: ProviderLike["updatedAt"]): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function inferConnected(record: ProviderLike): boolean {
  if (typeof record.connected === "boolean") return record.connected;
  if (record.status === "connected") return true;
  if (typeof record.scope === "string" && record.scope.trim().length > 0) return true;
  return false;
}

function inferAttention(record: ProviderLike): boolean {
  return record.status === "attention";
}

function inferFuture(record: ProviderLike): boolean {
  return record.readiness === "future" || providerKey(record) === "GOOGLE_TRENDS";
}

function summaryValue(record: ProviderLike): number {
  if (inferConnected(record)) return 1;
  if (inferAttention(record)) return 0;
  if (inferFuture(record)) return 0;
  return 0;
}

function summaryContext(record: ProviderLike): string {
  const parts: string[] = [];

  if (record.note && record.note.trim().length > 0) {
    parts.push(record.note.trim());
  } else if (inferConnected(record)) {
    parts.push("Workspace token is available.");
  } else if (inferFuture(record)) {
    parts.push("Future source scaffold is visible but not yet connected.");
  } else {
    parts.push("No active workspace token found.");
  }

  const updatedAt = asIsoString(record.updatedAt);
  if (updatedAt) {
    parts.push(`Last updated: ${updatedAt}`);
  }

  return parts.join(" ");
}

export function buildProviderStateSummaryCards(
  records: ProviderLike[]
): ProviderStateSummaryCard[] {
  return records.map((record) => {
    const key = providerKey(record);

    return {
      key,
      label: providerLabel(key),
      value: summaryValue(record),
      context: summaryContext(record),
    };
  });
}