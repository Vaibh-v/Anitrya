"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const pages = [
  { href: "/home", label: "Overview" },
  { href: "/home/seo", label: "SEO" },
  { href: "/home/behavior", label: "Behavior" },
  { href: "/home/intelligence", label: "Intelligence" },
  { href: "/home/settings", label: "Settings" },
];

export function HomeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Array<{ slug: string; name: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const project = searchParams.get("project");
  const activeProject = project ?? projects[0]?.slug ?? null;
  const preset = searchParams.get("preset") ?? "30d";

  function hrefFor(href: string) {
    const query = new URLSearchParams();
    if (activeProject) query.set("project", activeProject);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      query.set("from", from);
      query.set("to", to);
    } else if (preset === "7d" || preset === "90d") {
      const end = new Date();
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - Number.parseInt(preset, 10) + 1);
      query.set("from", start.toISOString().slice(0, 10));
      query.set("to", end.toISOString().slice(0, 10));
    }
    if (searchParams.has("preset")) query.set("preset", preset);
    return `${href}${query.size ? `?${query}` : ""}`;
  }

  function setRange(days: number) {
    const query = new URLSearchParams(searchParams.toString());
    if (activeProject) query.set("project", activeProject);
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    query.set("from", start.toISOString().slice(0, 10));
    query.set("to", end.toISOString().slice(0, 10));
    query.set("preset", `${days}d`);
    router.push(`${pathname}?${query}`);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/anitrya/projects", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!controller.signal.aborted && Array.isArray(payload?.projects)) {
          setProjects(payload.projects.map((item: { slug: string; name: string }) => ({ slug: item.slug, name: item.name })));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleKeys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const matches = pages.filter((page) => page.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <header className="eye-top">
        <Link href={hrefFor("/home")} className="eye-logo" aria-label="Anitrya home">
          <span className="eye-logo-mark" />Anitrya
        </Link>
        <label className="eye-pill eye-project-name">
          <span className="sr-only">Active project</span>
          <select aria-label="Active project" value={activeProject ?? ""} onChange={(event) => {
            const query = new URLSearchParams(searchParams.toString());
            query.set("project", event.target.value);
            router.push(`${pathname}?${query}`);
          }}>
            {!activeProject && <option value="">Project workspace</option>}
            {projects.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <div className="eye-top-spacer" />
        <div className="eye-segment" role="group" aria-label="Date range">
          {[7, 30, 90].map((days) => (
            <button key={days} type="button" aria-pressed={preset === `${days}d`} onClick={() => setRange(days)}>{days}d</button>
          ))}
        </div>
        <button className="eye-pill eye-search-trigger" type="button" onClick={() => setOpen(true)}>
          Search <span className="eye-kbd">Ctrl K</span>
        </button>
        <span className="eye-pill eye-workspace-pill">Workspace</span>
      </header>
      <nav className="eye-nav" aria-label="Primary navigation">
        {pages.map((page) => (
          <Link key={page.href} href={hrefFor(page.href)} aria-current={pathname === page.href ? "page" : undefined}>
            {page.label}
          </Link>
        ))}
      </nav>
      {open && (
        <div className="eye-command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="eye-command" role="dialog" aria-modal="true" aria-label="Navigate to a page">
            <input ref={inputRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jump to a page" aria-label="Search pages" />
            <div className="eye-command-items">
              {matches.length ? matches.map((page) => (
                <Link key={page.href} href={hrefFor(page.href)} onClick={() => setOpen(false)}>{page.label}<span>↗</span></Link>
              )) : <p>No matching pages.</p>}
            </div>
            <button type="button" className="eye-command-close" onClick={() => setOpen(false)}>Close · Esc</button>
          </div>
        </div>
      )}
    </>
  );
}
