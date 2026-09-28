"use client";

import { useEffect, useState } from "react";

type Check = { area: string; status: "ok" | "warn" | "fail"; detail: string };

const TAG = { ok: "eye-tag-green", warn: "eye-tag-amber", fail: "eye-tag-amber" } as const;
const LABEL = { ok: "OK", warn: "Check", fail: "Action needed" } as const;

/** Founder-only: Anitrya's own daily self-check (also emailed when something is wrong). */
export function HealthPanel() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [at, setAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.ok) {
          setChecks(p.checks);
          setAt(p.at);
        }
      })
      .catch(() => {});
  }, []);

  if (!checks) return null;
  return (
    <section className="eye-panel">
      <p className="eye-overline">Founder · System health</p>
      <div className="eye-health-list">
        {checks.map((c) => (
          <div key={c.area} className="eye-row">
            <span className={`eye-tag ${TAG[c.status]}`}>{LABEL[c.status]}</span>
            <span><strong>{c.area}</strong> — {c.detail}</span>
          </div>
        ))}
      </div>
      {at ? <p className="eye-finding-muted">Checked {new Date(at).toLocaleString()}. The nightly check emails you only when something needs attention.</p> : null}
    </section>
  );
}
