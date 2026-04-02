"use client";

import { useEffect, useState } from "react";

type CatalogResponse = {
  ok?: boolean;
  error?: string;
  summary?: {
    connectedCount: number;
    readyCount: number;
    blockedCount: number;
    preservedCount: number;
    items: Array<{
      key: string;
      connected: boolean;
      lifecycle: string;
      connectionMode: string;
      lastCheckedAt: string | null;
      lastSyncAt: string | null;
      statusLabel: string;
      blockers: string[];
      nextStep: string;
    }>;
  };
  catalog?: Array<{
    key: string;
    label: string;
    category: string;
    lifecycle: string;
    connectionMode: string;
    description: string;
    settingsSummary: string;
    evidenceRole: string;
  }>;
};

export function IntegrationCatalogPanel() {
  const [payload, setPayload] = useState<CatalogResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/integrations/catalog")
      .then((response) => response.json())
      .then((data: CatalogResponse) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to load integration catalog.");
          return;
        }
        setPayload(data);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Failed to load integration catalog.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/[0.08] p-5 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (!payload?.catalog || !payload.summary) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
        Loading integration catalog...
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div>
        <div className="text-2xl font-semibold text-white">Integration catalog</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          The full provider set preserved or active inside the product architecture.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Connected</div>
          <div className="mt-2 text-2xl font-semibold text-white">{payload.summary.connectedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Ready</div>
          <div className="mt-2 text-2xl font-semibold text-white">{payload.summary.readyCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Preserved</div>
          <div className="mt-2 text-2xl font-semibold text-white">{payload.summary.preservedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Blocked</div>
          <div className="mt-2 text-2xl font-semibold text-white">{payload.summary.blockedCount}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {payload.catalog.map((item) => {
          const state = payload.summary?.items.find((entry) => entry.key === item.key);

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-white/10 bg-black/16 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    {item.description}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/55">
                  {state?.statusLabel ?? item.lifecycle}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Evidence role
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    {item.evidenceRole}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Next step
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    {state?.nextStep ?? item.settingsSummary}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}