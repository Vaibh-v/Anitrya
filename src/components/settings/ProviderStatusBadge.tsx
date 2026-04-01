import type {
  ProviderConnectionState,
} from "@/lib/integrations/provider-state-contracts";

type Props = {
  state: ProviderConnectionState;
};

function stateClasses(state: ProviderConnectionState): string {
  switch (state) {
    case "connected":
      return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
    case "wired":
      return "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100";
    case "blocked":
      return "border-rose-400/20 bg-rose-400/[0.08] text-rose-100";
    case "reserved":
    default:
      return "border-white/10 bg-white/[0.03] text-white/65";
  }
}

export function ProviderStatusBadge({ state }: Props) {
  return (
    <div className={`rounded-full border px-2.5 py-1 text-xs ${stateClasses(state)}`}>
      {state}
    </div>
  );
}