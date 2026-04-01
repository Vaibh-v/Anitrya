"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProjectItem = {
  id: string;
  name: string;
  slug: string;
  ga4Property?: {
    id: string;
    displayName: string | null;
    propertyName: string;
  } | null;
  gscSite?: {
    id: string;
    siteUrl: string;
  } | null;
};

type PropertyItem = {
  id: string;
  label: string;
};

type SiteItem = {
  id: string;
  label: string;
};

export function ProjectSwitcher({
  projects,
  selectedProjectSlug,
  ga4Properties,
  gscSites
}: {
  projects: ProjectItem[];
  selectedProjectSlug?: string | null;
  ga4Properties: PropertyItem[];
  gscSites: SiteItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [gscSiteId, setGscSiteId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.slug === selectedProjectSlug) ?? null;
  }, [projects, selectedProjectSlug]);

  function switchProject(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", slug);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function createProject() {
    if (!name.trim()) return;

    setIsSubmitting(true);

    const res = await fetch("/api/anitrya/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name.trim(),
        ga4PropertyId: ga4PropertyId || null,
        gscSiteId: gscSiteId || null
      })
    });

    const json = await res.json().catch(() => null);

    setIsSubmitting(false);

    if (!res.ok) {
      alert(json?.error ?? "PROJECT_CREATE_FAILED");
      return;
    }

    const slug = json?.project?.slug;
    if (slug) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", slug);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    } else {
      router.refresh();
    }

    setName("");
    setGa4PropertyId("");
    setGscSiteId("");
    setIsOpen(false);
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-title">Project context</div>
          <div className="mt-2 text-xl font-semibold">
            {selectedProject?.name ?? "No project selected"}
          </div>
          <p className="mt-2 text-sm body-muted max-w-3xl">
            Intelligence is strongest when a single business context is selected.
            Each project should map to one GA4 property and one GSC site.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
        >
          {isOpen ? "Close Project Builder" : "Create Project"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="card-soft text-sm body-muted lg:col-span-3">
            No projects exist yet. Create your first project by pairing one GA4 property
            and one GSC site.
          </div>
        ) : (
          projects.map((project) => {
            const active = project.slug === selectedProjectSlug;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => switchProject(project.slug)}
                className={`card-soft text-left transition ${
                  active ? "ring-1 ring-white/20" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{project.name}</div>
                  {active ? <span className="badge badge-accent">Selected</span> : null}
                </div>

                <div className="mt-3 text-xs body-muted">
                  GA4: {project.ga4Property?.displayName ?? project.ga4Property?.propertyName ?? "Unlinked"}
                </div>
                <div className="mt-1 text-xs body-muted">
                  GSC: {project.gscSite?.siteUrl ?? "Unlinked"}
                </div>
              </button>
            );
          })
        )}
      </div>

      {isOpen ? (
        <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <div className="text-sm font-medium">Create Project</div>
            <p className="mt-1 text-sm body-muted">
              Pair a GA4 property and a GSC site so intelligence becomes business-specific instead of workspace-generic.
            </p>
          </div>

          <div>
            <label className="text-xs body-muted">Project name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none"
              placeholder="Clara AI"
            />
          </div>

          <div>
            <label className="text-xs body-muted">GA4 property</label>
            <select
              value={ga4PropertyId}
              onChange={(event) => setGa4PropertyId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">Select property</option>
              {ga4Properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs body-muted">GSC site</label>
            <select
              value={gscSiteId}
              onChange={(event) => setGscSiteId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">Select site</option>
              {gscSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={createProject}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}