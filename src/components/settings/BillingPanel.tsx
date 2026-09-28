"use client";

import { useEffect, useState } from "react";

type Plan = { id: string; label: string; projects: number; seats: number; aiPerMonth: number; available: boolean };
type Status = { plan: string; label: string; status: string; trialEndsAt: string | null; canManage: boolean; enabled: boolean; plans: Plan[] };

const PRICE_HINT: Record<string, string> = { starter: "For one business", growth: "For growing teams", agency: "For agencies with many clients" };

/** Current plan, trial countdown, one-click upgrade and the Stripe billing portal. */
export function BillingPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => p?.ok && setStatus(p))
      .catch(() => {});
  }, []);

  async function go(path: string, body?: object, key = path) {
    setBusy(key);
    setError(null);
    const payload = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) })
      .then((r) => r.json())
      .catch(() => null);
    if (payload?.url) window.location.href = payload.url;
    else {
      setError(payload?.error ?? "Billing is unavailable right now.");
      setBusy(null);
    }
  }

  if (!status) return <div className="eye-panel"><p className="eye-panel-text">Loading plan…</p></div>;
  const days = status.trialEndsAt ? Math.max(0, Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / 86400_000)) : null;
  const paid = ["starter", "growth", "agency"].includes(status.plan) && status.status === "active";

  return (
    <div className="eye-panel eye-billing">
      <div className="eye-billing-head">
        <div>
          <p className="eye-overline">Current plan</p>
          <h2>{status.label}</h2>
          <p className="eye-panel-text">
            {status.status === "readonly"
              ? "Read-only: your data is safe, but syncing and AI are paused until you choose a plan."
              : status.plan === "trial" && days !== null
                ? `${days} ${days === 1 ? "day" : "days"} left in your trial.`
                : status.plan === "founder"
                  ? "Founder access — no limits, no billing."
                  : "Active subscription."}
          </p>
        </div>
        {paid && status.canManage && status.enabled ? (
          <button type="button" className="eye-button" disabled={busy !== null} onClick={() => go("/api/billing/portal")}>
            {busy === "/api/billing/portal" ? "Opening…" : "Manage billing"}
          </button>
        ) : null}
      </div>

      {status.plan !== "founder" ? (
        <div className="eye-billing-plans">
          {status.plans.map((plan) => {
            const current = plan.id === status.plan && paid;
            return (
              <div key={plan.id} className={`eye-billing-plan ${current ? "is-current" : ""}`}>
                <strong>{plan.label}</strong>
                <span className="eye-finding-muted">{PRICE_HINT[plan.id]}</span>
                <ul>
                  <li>{plan.projects} projects</li>
                  <li>{plan.seats} team seats</li>
                  <li>{plan.aiPerMonth.toLocaleString()} AI answers / month</li>
                </ul>
                {current ? (
                  <span className="eye-tag eye-tag-green">Your plan</span>
                ) : status.canManage ? (
                  <button
                    type="button"
                    className="eye-button eye-button-primary"
                    disabled={!status.enabled || !plan.available || busy !== null}
                    onClick={() => (paid ? go("/api/billing/portal", {}, plan.id) : go("/api/billing/checkout", { plan: plan.id }, plan.id))}
                  >
                    {busy === plan.id ? "Opening checkout…" : paid ? "Switch" : "Choose"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {!status.enabled && status.plan !== "founder" ? <p className="eye-finding-muted">Online payment is being set up; contact us to upgrade in the meantime.</p> : null}
      {!status.canManage && status.plan !== "founder" ? <p className="eye-finding-muted">Only the organization owner can change the plan.</p> : null}
      {error ? <p className="eye-message is-error">{error}</p> : null}
    </div>
  );
}
