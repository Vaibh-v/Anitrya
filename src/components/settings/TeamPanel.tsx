"use client";

import { useCallback, useEffect, useState } from "react";

type Member = { userId: string; email: string; name: string | null; role: string; roleLabel: string; projectSlugs: string[] | null };
type Invite = { id: string; email: string; role: string; project_slugs: string[] | null; token: string; expires_at: string };
type Team = {
  me: { userId: string; role: string; permissions: string[] };
  plan: { id: string; label: string; status: string; trialEndsAt: string | null; isTest: boolean; limits: { seats: number; projects: number; aiPerMonth: number }; projects: number };
  policy: Record<string, Record<string, boolean>>;
  members: Member[];
  invites: Invite[];
  audit: Array<{ actor_email: string; action: string; created_at: string }>;
  assignableRoles: Array<{ id: string; label: string }>;
};

const TOGGLES: Array<{ id: string; label: string }> = [
  { id: "sync", label: "Run syncs" },
  { id: "export", label: "Export to Sheets" },
  { id: "ai", label: "Ask the AI" },
  { id: "manage_sources", label: "Change sources" },
  { id: "manage_projects", label: "Create projects" },
];

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));
}

/** Members, roles, project access, invites and (owner) role policy. */
export function TeamPanel(props: { projects: Array<{ slug: string; name: string }> }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [scope, setScope] = useState<string[]>([]);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const payload = await fetch("/api/org/members", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (payload?.ok) setTeam(payload);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!team) return null;
  const canManage = team.me.permissions.includes("manage_members");
  const isOwner = team.me.role === "OWNER";
  const left = daysLeft(team.plan.trialEndsAt);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    const payload = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!payload?.ok) setMessage({ error: true, text: payload?.error ?? "That didn't work." });
    await load();
    return payload;
  }

  async function invite() {
    const payload = await call("/api/org/invites", "POST", { email, role, projectSlugs: scope.length ? scope : null });
    if (payload?.ok) {
      setLink(payload.link);
      setEmail("");
      setScope([]);
      setMessage({ error: false, text: "Invitation created. Send this link to them — it works for 7 days." });
    }
  }

  function togglePolicy(roleId: string, permission: string) {
    const next = JSON.parse(JSON.stringify(team!.policy ?? {})) as Record<string, Record<string, boolean>>;
    next[roleId] = next[roleId] ?? {};
    if (next[roleId][permission] === false) delete next[roleId][permission];
    else next[roleId][permission] = false;
    call("/api/org/policy", "PATCH", { policy: next });
  }

  return (
    <section className="eye-panel eye-team">
      <div className="eye-directory-head">
        <div>
          <p className="eye-overline">Organization</p>
          <h2 className="eye-directory-title">
            {team.plan.label} plan{team.plan.isTest ? " · test" : ""}
            {team.plan.status === "readonly" ? " · read-only" : left !== null && team.plan.id === "trial" ? ` · ${left} day${left === 1 ? "" : "s"} left` : ""}
          </h2>
          <p className="eye-panel-text">
            {team.members.length} of {team.plan.limits.seats >= 1_000_000 ? "unlimited" : team.plan.limits.seats} seats · {team.plan.projects} of{" "}
            {team.plan.limits.projects >= 1_000_000 ? "unlimited" : team.plan.limits.projects} projects · You are {team.members.find((m) => m.userId === team.me.userId)?.roleLabel ?? team.me.role}
          </p>
        </div>
      </div>

      <div className="eye-table-wrap">
        <table className="eye-table">
          <thead>
            <tr><th>Member</th><th>Role</th><th>Projects</th>{canManage ? <th /> : null}</tr>
          </thead>
          <tbody>
            {team.members.map((member) => {
              const locked = member.role === "OWNER" || !canManage;
              return (
                <tr key={member.userId}>
                  <td className="eye-cell-label" title={member.email}>{member.name ? `${member.name} · ` : ""}{member.email}</td>
                  <td>
                    {locked ? (
                      member.roleLabel
                    ) : (
                      <select value={member.role} disabled={busy} onChange={(e) => call("/api/org/members", "PATCH", { userId: member.userId, role: e.target.value })}>
                        {team.assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {locked ? (
                      member.projectSlugs ? member.projectSlugs.join(", ") : "All"
                    ) : (
                      <select
                        multiple
                        value={member.projectSlugs ?? []}
                        disabled={busy}
                        aria-label="Projects this member can see (none selected = all)"
                        onChange={(e) => {
                          const picked = Array.from(e.target.selectedOptions).map((o) => o.value);
                          call("/api/org/members", "PATCH", { userId: member.userId, projectSlugs: picked.length ? picked : null });
                        }}
                      >
                        {props.projects.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                      </select>
                    )}
                  </td>
                  {canManage ? (
                    <td className="eye-num">
                      {member.role !== "OWNER" ? (
                        <button type="button" className="eye-button" disabled={busy} onClick={() => call(`/api/org/members?userId=${encodeURIComponent(member.userId)}`, "DELETE")}>Remove</button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <>
          <div className="eye-form">
            <label>
              <span>Invite by email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </label>
            <label>
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {team.assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            <label>
              <span>Projects {role === "CLIENT_VIEWER" ? "(required)" : "(none = all)"}</span>
              <select multiple value={scope} onChange={(e) => setScope(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                {props.projects.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </label>
            <button type="button" className="eye-button eye-button-primary" disabled={busy || !email} onClick={invite}>Create invite</button>
          </div>
          {link ? (
            <p className="eye-message">
              <span className="eye-mono">{link}</span>{" "}
              <button type="button" className="eye-button" onClick={() => navigator.clipboard?.writeText(link)}>Copy</button>
            </p>
          ) : null}
          {team.invites.length > 0 ? (
            <div className="eye-section">
              {team.invites.map((inv) => (
                <div key={inv.id} className="eye-row">
                  <span>{inv.email} · {team.assignableRoles.find((r) => r.id === inv.role)?.label ?? inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                  <button type="button" className="eye-button" disabled={busy} onClick={() => call(`/api/org/invites?id=${encodeURIComponent(inv.id)}`, "DELETE")}>Revoke</button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {isOwner ? (
        <div className="eye-section">
          <p className="eye-overline">What each role may do</p>
          <div className="eye-table-wrap">
            <table className="eye-table">
              <thead>
                <tr><th>Role</th>{TOGGLES.map((t) => <th key={t.id} className="eye-num">{t.label}</th>)}</tr>
              </thead>
              <tbody>
                {team.assignableRoles.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    {TOGGLES.map((t) => {
                      const base = r.id === "ADMIN" ? true : r.id === "ANALYST" ? ["sync", "export", "ai"].includes(t.id) : false;
                      const off = team.policy?.[r.id]?.[t.id] === false;
                      return (
                        <td key={t.id} className="eye-num">
                          {base ? (
                            <input type="checkbox" checked={!off} disabled={busy} onChange={() => togglePolicy(r.id, t.id)} aria-label={`${r.label}: ${t.label}`} />
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {canManage && team.audit.length > 0 ? (
        <details className="eye-section">
          <summary className="eye-overline">Access log</summary>
          {team.audit.map((a, i) => (
            <div key={i} className="eye-row"><span>{new Date(a.created_at).toLocaleString()} · {a.actor_email}</span><span>{a.action}</span></div>
          ))}
        </details>
      ) : null}

      {message ? <p className={`eye-message${message.error ? " is-error" : ""}`}>{message.text}</p> : null}
    </section>
  );
}
