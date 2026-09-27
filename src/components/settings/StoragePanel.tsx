"use client";

import { useEffect, useState } from "react";

type Status = { mode: "lean" | "full"; usedMb: number | null; limitMb: number | null };

/** Founder-only: database usage and the one-click Lean ↔ Full storage switch. */
export function StoragePanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const payload = await fetch("/api/admin/storage", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (payload?.ok) setStatus(payload);
  }

  useEffect(() => {
    load();
  }, []);

  async function post(body: Record<string, string>, done: string) {
    setBusy(true);
    setMessage(null);
    const payload = await fetch("/api/admin/storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    setMessage(payload?.ok ? done : "That didn't work — try again in a minute.");
    if (payload?.mode) setStatus(payload);
  }

  if (!status) return null;
  const pct = status.usedMb !== null && status.limitMb ? Math.min(100, Math.round((status.usedMb / status.limitMb) * 100)) : null;

  return (
    <section className="eye-panel eye-storage">
      <div className="eye-directory-head">
        <div>
          <p className="eye-overline">Founder · Database storage</p>
          <h2 className="eye-directory-title">
            {status.usedMb ?? "?"} MB{status.limitMb ? ` of ${status.limitMb} MB` : ""} · {status.mode === "lean" ? "Lean (free plan)" : "Full (paid plan)"}
          </h2>
          <p className="eye-panel-text">
            {status.mode === "lean"
              ? "Last 180 days kept in full. Older months are archived to Google Sheets first, then only 0-click long-tail search rows are trimmed from the database."
              : "Every row is kept in the database. Nothing is trimmed."}
          </p>
        </div>
        <div className="eye-actions-inline">
          {status.mode === "lean" ? (
            <button type="button" className="eye-button eye-button-primary" disabled={busy} onClick={() => post({ action: "mode", mode: "full" }, "Switched to Full. Do this after upgrading the database plan.")}>
              Switch to Full
            </button>
          ) : (
            <button type="button" className="eye-button" disabled={busy} onClick={() => post({ action: "mode", mode: "lean" }, "Switched to Lean.")}>
              Switch to Lean
            </button>
          )}
          {status.mode === "lean" ? (
            <button type="button" className="eye-button" disabled={busy} onClick={() => post({ action: "maintain" }, "Archiving and freeing space in the background. Check back in a few minutes.")}>
              Free up space now
            </button>
          ) : null}
        </div>
      </div>
      {pct !== null ? (
        <div className="eye-storage-bar" aria-label={`${pct}% used`}>
          <span style={{ width: `${pct}%` }} className={pct >= 85 ? "is-high" : ""} />
        </div>
      ) : null}
      {message ? <p className="eye-message">{message}</p> : null}
    </section>
  );
}
