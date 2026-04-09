"use client";

import { useEffect, useState } from "react";

type MappingOptionsResponse = {
  ga4Properties: Array<{
    id: string;
    externalId: string;
    name: string;
  }>;
  gscSites: Array<{
    id: string;
    siteUrl: string;
    permissionLevel: string;
  }>;
};

type Props = {
  projectSlug: string;
  projectLabel: string;
  currentGa4PropertyId: string | null;
  currentGscSiteId: string | null;
};

export function ProjectMappingPanel({
  projectSlug,
  projectLabel,
  currentGa4PropertyId,
  currentGscSiteId,
}: Props) {
  const [options, setOptions] = useState<MappingOptionsResponse>({
    ga4Properties: [],
    gscSites: [],
  });
  const [ga4PropertyId, setGa4PropertyId] = useState(currentGa4PropertyId ?? "");
  const [gscSiteId, setGscSiteId] = useState(currentGscSiteId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "idle" | "success" | "error";
    text: string;
  }>({
    type: "idle",
    text: `Map ${projectLabel} to one owned GA4 property and one owned Search Console site.`,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const response = await fetch("/api/projects/mapping-options", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<MappingOptionsResponse> & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load mapping options.");
        }

        if (!active) return;

        const nextOptions: MappingOptionsResponse = {
          ga4Properties: payload.ga4Properties ?? [],
          gscSites: payload.gscSites ?? [],
        };

        setOptions(nextOptions);

        if (
          currentGa4PropertyId &&
          nextOptions.ga4Properties.some((item) => item.id === currentGa4PropertyId)
        ) {
          setGa4PropertyId(currentGa4PropertyId);
        } else if (!currentGa4PropertyId && nextOptions.ga4Properties.length === 1) {
          setGa4PropertyId(nextOptions.ga4Properties[0].id);
        }

        if (
          currentGscSiteId &&
          nextOptions.gscSites.some((item) => item.id === currentGscSiteId)
        ) {
          setGscSiteId(currentGscSiteId);
        } else if (!currentGscSiteId && nextOptions.gscSites.length === 1) {
          setGscSiteId(nextOptions.gscSites[0].id);
        }
      } catch (error) {
        if (!active) return;
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load mapping options.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [currentGa4PropertyId, currentGscSiteId]);

  async function handleSave() {
    try {
      setSaving(true);

      const response = await fetch("/api/projects/update-mapping", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectSlug,
          ga4PropertyId,
          gscSiteId,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save project mapping.");
      }

      setMessage({
        type: "success",
        text: "Project mapping saved. Run entity sync again for this project.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save project mapping.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,79,0.88),rgba(5,15,39,0.94))] px-8 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-white">
            Project mapping health
          </h2>
          <p className="mt-3 text-[18px] leading-8 text-white/72">
            Map <span className="font-semibold text-white">{projectLabel}</span> to a real GA4
            property and a real Search Console site owned by the connected Google account.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/4 px-5 py-3 text-[16px] text-white/78">
          {projectLabel}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-black/10 p-6">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
            GA4 property
          </div>

          <select
            value={ga4PropertyId}
            onChange={(event) => setGa4PropertyId(event.target.value)}
            disabled={loading || saving}
            className="mt-5 h-16 w-full rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none"
          >
            <option value="">Select owned GA4 property</option>
            {options.ga4Properties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.externalId})
              </option>
            ))}
          </select>

          <div className="mt-4 text-[15px] leading-7 text-white/56">
            Saved value: {currentGa4PropertyId ?? "Not mapped"}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/10 p-6">
          <div className="text-[12px] uppercase tracking-[0.28em] text-white/48">
            Search Console site
          </div>

          <select
            value={gscSiteId}
            onChange={(event) => setGscSiteId(event.target.value)}
            disabled={loading || saving}
            className="mt-5 h-16 w-full rounded-[18px] border border-white/12 bg-white/4 px-5 text-[18px] text-white outline-none"
          >
            <option value="">Select owned Search Console site</option>
            {options.gscSites.map((item) => (
              <option key={item.id} value={item.id}>
                {item.siteUrl}
              </option>
            ))}
          </select>

          <div className="mt-4 text-[15px] leading-7 text-white/56">
            Saved value: {currentGscSiteId ?? "Not mapped"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || !ga4PropertyId || !gscSiteId}
          className="h-14 rounded-[18px] border border-cyan-300/30 bg-cyan-300/10 px-7 text-[17px] font-semibold text-cyan-100 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save project mapping"}
        </button>

        <div
          className={`rounded-[18px] border px-4 py-3 text-[15px] leading-7 ${
            message.type === "error"
              ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
              : message.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/4 text-white/68"
          }`}
        >
          {message.text}
        </div>
      </div>
    </section>
  );
}