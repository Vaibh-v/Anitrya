"use client";

import { ProviderConnectButton } from "./ProviderConnectButton";
import { ProviderDisconnectButton } from "./ProviderDisconnectButton";

type Props = {
  provider: string;
  label: string;
  connected: boolean;
  mode: "oauth" | "api_key";
};

export function ProviderConnectionCard({
  provider,
  label,
  connected,
  mode,
}: Props) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-white/70">{label}</div>
          <div className="text-xs text-white/40">
            {connected ? "Connected" : "Not connected"}
          </div>
        </div>

        {connected ? (
          <ProviderDisconnectButton provider={provider} />
        ) : (
          <ProviderConnectButton
            provider={provider}
            label={label}
            mode={mode}
          />
        )}
      </div>
    </div>
  );
}