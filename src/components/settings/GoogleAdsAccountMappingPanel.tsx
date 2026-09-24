"use client";

import { useEffect, useState } from "react";

type AdsAccount = {
  id: string;
  label: string;
  loginCustomerId: string | null;
};

type SavedMapping = {
  resourceName: string;
  displayName: string;
  loginCustomerId: string | null;
};

type MappingOptions = {
  ok: boolean;
  error?: string;
  reason?: string;
  accounts?: AdsAccount[];
  savedMapping?: SavedMapping | null;
};

export function GoogleAdsAccountMappingPanel({
  projectSlug,
  projectLabel,
}: {
  projectSlug: string;
  projectLabel: string;
}) {
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [savedMapping, setSavedMapping] = useState<SavedMapping | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/projects/google-ads-mapping-options?project=${encodeURIComponent(projectSlug)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as MappingOptions;
        if (!active) return;

        setAccounts(payload.accounts ?? []);
        setSavedMapping(payload.savedMapping ?? null);
        setCustomerName(payload.savedMapping?.resourceName ?? "");
        setError(!response.ok || !payload.ok);
        setMessage(
          payload.error ?? payload.reason ??
            (payload.savedMapping ? "Google Ads account mapping saved." : "Select a discovered account."),
        );
      } catch (caught) {
        if (!active) return;
        setError(true);
        setMessage(caught instanceof Error ? caught.message : "Could not discover Google Ads accounts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccounts();
    return () => { active = false; };
  }, [projectSlug]);

  async function saveMapping() {
    setSaving(true);
    try {
      const response = await fetch("/api/projects/update-google-ads-mapping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project: projectSlug, resourceName: customerName }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not save Google Ads mapping.");
      }

      setSavedMapping(payload.mapping);
      setError(false);
      setMessage("Google Ads account mapping saved. Run project sync to collect campaign data.");
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Could not save Google Ads mapping.");
    } finally {
      setSaving(false);
    }
  }

  const selected = accounts.find((account) => account.id === customerName);

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,31,57,0.9),rgba(4,16,33,0.96))] px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-semibold text-white">Google Ads mapping</h2>
          <p className="mt-3 text-[17px] text-white/66">
            Connect {projectLabel} to an accessible Ads customer for campaign evidence.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/70">
          {savedMapping ? "Mapped" : "Not mapped"}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="ads-customer" className="text-xs uppercase tracking-[0.22em] text-white/50">
            Ads customer
          </label>
          <select
            id="ads-customer"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={loading || saving}
            className="mt-3 h-14 w-full rounded-[16px] border border-white/12 bg-white/4 px-4 text-base text-white"
          >
            <option value="">Select a Google Ads customer</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} ({account.id.replace("customers/", "")})
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm text-white/55">
            Saved value: {savedMapping?.displayName ?? "Not mapped"}
            {selected?.loginCustomerId ? ` · Manager ${selected.loginCustomerId}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={saveMapping}
          disabled={loading || saving || !selected}
          className="h-14 self-end rounded-[18px] border border-cyan-300/30 bg-cyan-300/10 px-7 text-base font-semibold text-cyan-100 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Ads mapping"}
        </button>
      </div>

      {message ? (
        <p className={`mt-5 rounded-[18px] border px-4 py-3 text-sm ${error ? "border-rose-400/25 bg-rose-400/10 text-rose-100" : "border-white/10 bg-white/5 text-white/70"}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
