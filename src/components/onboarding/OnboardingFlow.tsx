"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { propertyName, suggestSite, type Option } from "@/lib/projects/pair-properties";

type Candidate = { ga4: Option; gsc: Option | null; name: string };
type Stage = { days: number; done: boolean; rows: number };

const STAGE_COPY: Record<number, { title: string; detail: string }> = {
  7: { title: "Pulse — last 7 days", detail: "Sessions, clicks and top pages" },
  28: { title: "Detail — last 28 days", detail: "Full tables and the first findings" },
  90: { title: "Depth — last 90 days", detail: "Trends and period-over-period comparisons" },
};

export function OnboardingFlow(props: { firstName: string | null; returning: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "build">("pick");
  const [ga4, setGa4] = useState<Option[]>([]);
  const [gsc, setGsc] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [siteOverride, setSiteOverride] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef<number>(0);

  useEffect(() => {
    let active = true;
    fetch("/api/projects/mapping-options", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) throw new Error(payload.error ?? "We couldn't read your Google properties.");
        setGa4(payload.ga4Properties ?? []);
        setGsc(payload.gscSites ?? []);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "We couldn't read your Google properties."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const candidates: Candidate[] = useMemo(
    () => ga4.map((option) => ({ ga4: option, gsc: suggestSite(option, gsc), name: propertyName(option.label) })),
    [ga4, gsc],
  );
  const chosen = candidates.find((c) => c.ga4.id === selected) ?? null;
  const chosenSiteId = chosen ? siteOverride[chosen.ga4.id] ?? chosen.gsc?.id ?? "" : "";

  function choose(candidate: Candidate) {
    setSelected(candidate.ga4.id);
    setName(candidate.name);
  }

  async function build() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/anitrya/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || chosen.name, ga4PropertyId: chosen.ga4.id, gscSiteId: chosenSiteId || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Could not create the project.");
      const newSlug: string = payload.project.slug;
      started.current = Date.now();
      setSlug(newSlug);
      setStep("build");
      await fetch("/api/sync/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projects: [newSlug] }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the project.");
    } finally {
      setBusy(false);
    }
  }

  // Poll progress; open the dashboard as soon as the 7-day view has landed.
  useEffect(() => {
    if (step !== "build" || !slug) return;
    let active = true;
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 250);
    async function poll() {
      const payload = await fetch(`/api/onboarding/progress?project=${encodeURIComponent(slug!)}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (!active) return;
      if (payload?.stages) setStages(payload.stages);
      const pulse = payload?.stages?.find((s: Stage) => s.days === 7);
      if (pulse?.done) {
        // Instant Insight is measured on every new project (see Settings → Health).
        void fetch("/api/onboarding/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: slug, seconds: Math.round((Date.now() - started.current) / 1000) }) }).catch(() => {});
        setTimeout(() => router.push(`/home?project=${encodeURIComponent(slug!)}&preset=7d`), 900);
        return;
      }
      if (Date.now() - started.current > 120_000) {
        void fetch("/api/onboarding/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: slug, seconds: 120, timedOut: true }) }).catch(() => {});
        router.push(`/home?project=${encodeURIComponent(slug!)}`);
        return;
      }
      setTimeout(poll, 1500);
    }
    poll();
    return () => {
      active = false;
      clearInterval(tick);
    };
  }, [step, slug, router]);

  if (step === "build") {
    return (
      <section className="eye-onboard eye-panel" aria-live="polite">
        <p className="eye-overline">Building {name || "your dashboard"}</p>
        <h1 className="eye-onboard-title">
          <span className="eye-mono eye-onboard-clock">{elapsed}s</span> Instant Insight in progress
        </h1>
        <p className="eye-panel-text">Your dashboard opens the moment the 7-day view is ready. The longer history keeps loading in the background.</p>
        <ol className="eye-onboard-stages">
          {[7, 28, 90].map((days) => {
            const stage = stages.find((s) => s.days === days);
            const done = Boolean(stage?.done);
            const active = !done && stages.filter((s) => s.done).length === [7, 28, 90].indexOf(days);
            return (
              <li key={days} className={done ? "is-done" : active ? "is-active" : ""}>
                <span className="eye-onboard-dot" aria-hidden="true" />
                <div>
                  <strong>{STAGE_COPY[days].title}</strong>
                  <span>{done ? `${(stage?.rows ?? 0).toLocaleString()} rows ready` : STAGE_COPY[days].detail}</span>
                </div>
              </li>
            );
          })}
        </ol>
        {error ? <p className="eye-message is-error">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="eye-onboard eye-panel">
      <p className="eye-overline">{props.returning ? "Add a project" : `Welcome${props.firstName ? `, ${props.firstName}` : ""}`}</p>
      <h1 className="eye-onboard-title">Which website should Anitrya read?</h1>
      <p className="eye-panel-text">
        These are the Google Analytics properties your Google account can access. We pair each with its Search Console site automatically.
      </p>

      {loading ? <p className="eye-panel-text">Finding your Google properties…</p> : null}
      {error ? <p className="eye-message is-error">{error}</p> : null}
      {!loading && !error && candidates.length === 0 ? (
        <p className="eye-message is-error">
          No Google Analytics properties were found for this Google account. Sign in with the account that has access to your GA4 property.
        </p>
      ) : null}

      <div className="eye-onboard-grid" role="radiogroup" aria-label="Website">
        {candidates.map((candidate) => (
          <button
            key={candidate.ga4.id}
            type="button"
            role="radio"
            aria-checked={selected === candidate.ga4.id}
            className={`eye-onboard-card${selected === candidate.ga4.id ? " is-selected" : ""}`}
            onClick={() => choose(candidate)}
          >
            <strong>{candidate.name}</strong>
            <span>GA4 · {candidate.ga4.label}</span>
            <span>{candidate.gsc ? `Search Console · ${candidate.gsc.label}` : "No matching Search Console site"}</span>
          </button>
        ))}
      </div>

      {chosen ? (
        <div className="eye-form eye-onboard-form">
          <label>
            <span>Project name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Search Console site</span>
            <select value={chosenSiteId} onChange={(event) => setSiteOverride({ ...siteOverride, [chosen.ga4.id]: event.target.value })}>
              <option value="">None for now</option>
              {gsc.map((site) => (
                <option key={site.id} value={site.id}>{site.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="eye-button eye-button-primary" disabled={busy} onClick={build}>
            {busy ? "Starting…" : "Build my dashboard →"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
