"use client";

type Props = {
  providerKey: string;
  title: string;
  description: string;
  state: "active" | "preserved" | "blocked";
  enabled: boolean;
  disabledReason?: string;
  onToggle: (nextValue: boolean) => void;
};

function stateTone(state: Props["state"]) {
  if (state === "active") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (state === "blocked") {
    return "border-rose-400/20 bg-rose-400/[0.08] text-rose-100";
  }
  return "border-amber-400/20 bg-amber-400/[0.08] text-amber-100";
}

export function IntegrationToggleCard({
  providerKey,
  title,
  description,
  state,
  enabled,
  disabledReason,
  onToggle,
}: Props) {
  const isSwitchDisabled = state !== "active";

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
        </div>

        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${stateTone(state)}`}>
          {state}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-black/16 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-white">
            {enabled ? "Enabled" : "Disabled"}
          </div>
          <div className="mt-1 text-xs text-white/45">{providerKey}</div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isSwitchDisabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
            enabled ? "bg-cyan-400/50" : "bg-white/10"
          } ${isSwitchDisabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
              enabled ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {disabledReason ? (
        <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/55">
          {disabledReason}
        </div>
      ) : null}
    </div>
  );
}