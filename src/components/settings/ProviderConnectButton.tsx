"use client";

import { useState } from "react";

type Props = {
  provider: string;
  label: string;
  mode: "oauth" | "api_key";
};

export function ProviderConnectButton({ provider, label, mode }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    try {
      setLoading(true);

      if (mode === "oauth") {
        window.location.href = `/api/integrations/${provider}/connect`;
        return;
      }

      const apiKey = window.prompt(`Enter API key for ${label}`);
      if (!apiKey) {
        return;
      }

      const response = await fetch("/api/integrations/api-key/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          provider,
          apiKey,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to connect ${label}`);
      }

      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to connect ${label}`;
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={loading}
      className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 disabled:opacity-60"
    >
      {loading ? "Connecting..." : `Connect ${label}`}
    </button>
  );
}