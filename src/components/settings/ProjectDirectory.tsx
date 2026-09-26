"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type DirectoryProject = {
  id: string;
  slug: string;
  name: string;
  ga4PropertyId: string | null;
  gscSiteId: string | null;
  ga4Label: string | null;
  gscLabel: string | null;
};

type Option = { id: string; label: string };

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/\(\d+\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !["https", "http", "domain", "www"].includes(word));
}

function siteHost(label: string) {
  return label.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

/** Best-effort pairing of a GA4 property with a Search Console site by shared name words. */
function suggestSite(ga4: Option, sites: Option[]): Option | null {
  const tokens = words(ga4.label);
  let best: { site: Option; score: number } | null = null;
  for (const site of sites) {
    const host = siteHost(site.label).toLowerCase();
    const score = tokens.filter((token) => host.includes(token)).length;
    if (score > 0 && (!best || score > best.score)) best = { site, score };
  }
  return best?.site ?? null;
}

function propertyName(label: string) {
  return label.replace(/\s*\(\d+\)\s*$/, "").replace(/\s*-\s*GA4$/i, "").trim() || label;
}

export function ProjectDirectory(props: {
  projects: DirectoryProject[];
  selectedSlug: string | null;
  preset: string;
}) {
  const router = useRouter();
  const [ga4, setGa4] = useState<Option[]>([]);
  const [gsc, setGsc] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [gscId, setGscId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects/mapping-options", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) throw new Error(payload.error ?? "Could not load Google properties.");
        setGa4(payload.ga4Properties ?? []);
        setGsc(payload.gscSites ?? []);
      })
      .catch((error) => active && setOptionsError(error instanceof Error ? error.message : "Could not load Google properties."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    const usedGa4 = new Set(props.projects.map((project) => project.ga4PropertyId).filter(Boolean));
    return ga4
      .filter((option) => !usedGa4.has(option.id))
      .map((option) => ({ ga4: option, gsc: suggestSite(option, gsc) }));
  }, [ga4, gsc, props.projects]);

  function openForm(prefill?: { ga4: Option; gsc: Option | null }) {
    setFormOpen(true);
    setMessage(null);
    setName(prefill ? propertyName(prefill.ga4.label) : "");
    setGa4Id(prefill?.ga4.id ?? "");
    setGscId(prefill?.gsc?.id ?? "");
  }

  async function createProject() {
    if (!name.trim()) {
      setMessage({ error: true, text: "Give the project a name." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/anitrya/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), ga4PropertyId: ga4Id || null, gscSiteId: gscId || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Could not create the project.");
      router.push(`/home/settings?project=${encodeURIComponent(payload.project.slug)}&preset=${props.preset}`);
      router.refresh();
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : "Could not create the project." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="eye-panel eye-directory">
      <div className="eye-directory-head">
        <div>
          <p className="eye-overline">Projects</p>
          <h2 className="eye-directory-title">{props.projects.length} project{props.projects.length === 1 ? "" : "s"} in this workspace</h2>
          <p className="eye-panel-text">Each project should map to its own GA4 property and Search Console site.</p>
        </div>
        <button type="button" className="eye-button eye-button-primary" onClick={() => (formOpen ? setFormOpen(false) : openForm())}>
          {formOpen ? "Close" : "Create project"}
        </button>
      </div>

      <div className="eye-project-grid">
        {props.projects.map((project) => {
          const selected = project.slug === props.selectedSlug;
          return (
            <a
              key={project.id}
              href={`/home/settings?project=${encodeURIComponent(project.slug)}&preset=${props.preset}`}
              className={`eye-project-card${selected ? " is-selected" : ""}`}
            >
              <div className="eye-project-card-head">
                <strong>{project.name}</strong>
                {selected ? <span className="eye-tag eye-tag-green">Selected</span> : null}
              </div>
              <div className="eye-row"><span>GA4</span><strong>{project.ga4Label ?? "Not mapped"}</strong></div>
              <div className="eye-row"><span>Search Console</span><strong>{project.gscLabel ?? "Not mapped"}</strong></div>
            </a>
          );
        })}
      </div>

      {formOpen ? (
        <div className="eye-form">
          <label>
            <span>Project name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Clara AI" />
          </label>
          <label>
            <span>GA4 property</span>
            <select value={ga4Id} onChange={(event) => setGa4Id(event.target.value)} disabled={loading}>
              <option value="">Not mapped yet</option>
              {ga4.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Search Console site</span>
            <select value={gscId} onChange={(event) => setGscId(event.target.value)} disabled={loading}>
              <option value="">Not mapped yet</option>
              {gsc.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" className="eye-button eye-button-primary" disabled={busy} onClick={createProject}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      ) : null}

      {message ? <p className={`eye-message${message.error ? " is-error" : ""}`}>{message.text}</p> : null}

      <div className="eye-suggestions-block">
        <h3>Available from your Google account</h3>
        {loading ? <p className="eye-panel-text">Loading GA4 properties and Search Console sites…</p> : null}
        {optionsError ? <p className="eye-message is-error">{optionsError}</p> : null}
        {!loading && !optionsError && suggestions.length === 0 ? (
          <p className="eye-panel-text">Every GA4 property you can access already has a project.</p>
        ) : null}
        <div className="eye-suggestion-list">
          {suggestions.map((suggestion) => (
            <div key={suggestion.ga4.id} className="eye-suggestion">
              <div>
                <strong>{suggestion.ga4.label}</strong>
                <span>{suggestion.gsc ? `Suggested site: ${suggestion.gsc.label}` : "No matching Search Console site found"}</span>
              </div>
              <button type="button" className="eye-button" onClick={() => openForm(suggestion)}>Set up</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
