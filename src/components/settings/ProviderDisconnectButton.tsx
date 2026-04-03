"use client";

import { useState } from "react";

type Props = {
  provider: string;
};

export function ProviderDisconnectButton({ provider }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    try {
      setLoading(true);

      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ provider }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to disconnect provider");
      }

      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect provider";
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={loading}
      className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100 disabled:opacity-60"
    >
      {loading ? "Disconnecting..." : "Disconnect"}
    </button>
  );
}