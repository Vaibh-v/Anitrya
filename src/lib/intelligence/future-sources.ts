import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

export type FutureSourceCategory = "core" | "expansion" | "market";
export type FutureSourceState = "connected" | "preserved" | "planned";

export type FutureSourceSignal = {
  key: string;
  label: string;
  state: FutureSourceState;
  category: FutureSourceCategory;
  intelligenceRole: string;
  currentStateLabel: string;
  nextUnlock: string;
  uiSummary: string;
};

function toState(value: "Connected" | "Preserved" | "Planned"): FutureSourceState {
  if (value === "Connected") return "connected";
  if (value === "Preserved") return "preserved";
  return "planned";
}

export function buildFutureSourceSignals(): FutureSourceSignal[] {
  return INTEGRATION_CATALOG.map((item) => ({
    key: item.key,
    label: item.label,
    state: toState(item.statusLabel),
    category: item.category,
    intelligenceRole: item.intelligenceRole,
    currentStateLabel: item.statusLabel,
    nextUnlock: item.futureValue,
    uiSummary: item.description,
  }));
}

export function getExpansionSignals(): FutureSourceSignal[] {
  return buildFutureSourceSignals().filter(
    (item) => item.category === "expansion" || item.category === "market"
  );
}

export function getConnectedSignals(): FutureSourceSignal[] {
  return buildFutureSourceSignals().filter((item) => item.state === "connected");
}