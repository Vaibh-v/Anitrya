"use client";

import { useCallback, useEffect, useState } from "react";

type Org = {
  id: string;
  name: string;
  owner: string | null;
  members: number;
  projects: number;
  createdAt: string;
  plan?: string;
  status?: string;
  is_test?: boolean;
  trial_ends_at?: string | null;
  expires_at?: string | null;
};

export function FounderConsole() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; label: string }>>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(14);
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const payload = await fetch("/api/founder/orgs", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (payload?.ok) {
      setOrgs(payload.organizations);
      setPlans(payload.plans);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function call(method: string, body: unknown) {
    setBusy(true);
    setMessage(null);
    const payload = await fetch("/api/founder/orgs", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!payload?.ok) setMessage(payload?.error ?? "That didn't work.");
    await load();
    return payload;
  }

  const active = orgs.filter((o) => !o.is_test);
  const tests = orgs.filter((o) => o.is_test);

  return (
    <div className="eye-page">
      <section className="eye-heading">
        <div>
          <p className="eye-overline">Founder console</p>
          <h1>{active.length} organization{active.length === 1 ? "" : "s"} · {tests.length} test</h1>
          <p>Plans, trials and test accounts across Anitrya. Only you can see this page.</p>
        </div>
      </section>

      <section className="eye-panel">
        <h2>Create a test organization</h2>
        <p className="eye-panel-text">Creates an empty organization flagged as test and an Owner invite for the email. Test organizations never count as customers.</p>
        <div className="eye-form">
          <label><span>Organization name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme test" /></label>
          <label><span>Owner email</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tester@company.com" /></label>
          <label><span>Days until it expires</span><input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
          <button
            type="button"
            className="eye-button eye-button-primary"
            disabled={busy || !name || !email}
            onClick={async () => {
              const payload = await call("POST", { name, ownerEmail: email, days });
              if (payload?.ok) {
                setLink(payload.link);
                setName("");
                setEmail("");
              }
            }}
          >
            Create
          </button>
        </div>
        {link ? (
          <p className="eye-message">
            Invite link: <span className="eye-mono">{link}</span>{" "}
            <button type="button" className="eye-button" onClick={() => navigator.clipboard?.writeText(link)}>Copy</button>
          </p>
        ) : null}
      </section>

      <section className="eye-panel">
        <h2>All organizations</h2>
        <div className="eye-table-wrap">
          <table className="eye-table">
            <thead>
              <tr>
                <th>Organization</th><th>Owner</th><th className="eye-num">Members</th><th className="eye-num">Projects</th><th>Plan</th><th>Status</th><th>Trial / expiry</th><th />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="eye-cell-label" title={org.id}>{org.name}{org.is_test ? " · test" : ""}</td>
                  <td>{org.owner ?? "—"}</td>
                  <td className="eye-num">{org.members}</td>
                  <td className="eye-num">{org.projects}</td>
                  <td>
                    <select value={org.plan ?? "trial"} disabled={busy} onChange={(e) => call("PATCH", { workspaceId: org.id, plan: e.target.value })}>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={org.status ?? "trial"} disabled={busy} onChange={(e) => call("PATCH", { workspaceId: org.id, status: e.target.value })}>
                      {["trial", "active", "readonly", "test"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : org.expires_at ? new Date(org.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="eye-num">
                    <button type="button" className="eye-button" disabled={busy} onClick={() => call("PATCH", { workspaceId: org.id, extendDays: 14 })}>+14 days</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {message ? <p className="eye-message is-error">{message}</p> : null}
    </div>
  );
}
