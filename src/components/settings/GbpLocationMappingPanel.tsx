"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { syncProjectSources } from "@/lib/integrations/client-provider-sync";

type GbpLocationOption = {
  id: string;
  label: string;
  accountName: string | null;
  storeCode: string | null;
  primaryCategory: string | null;
  locality: string | null;
  regionCode: string | null;
};

type GbpSavedMapping = {
  locationName: string;
  displayName: string;
  accountName: string | null;
  primaryCategory: string | null;
  locality: string | null;
  regionCode: string | null;
  savedAt: string;
};

type MappingOptionsResponse = {
  ok: boolean;
  error?: string;
  reason?: string;
  locations: GbpLocationOption[];
  savedMapping: GbpSavedMapping | null;
};

type Props = {
  projectSlug: string;
  projectLabel: string;
};

function locationContext(location: GbpLocationOption | GbpSavedMapping) {
  return [
    location.primaryCategory,
    location.locality,
    location.regionCode,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function GbpLocationMappingPanel({
  projectSlug,
  projectLabel,
}: Props) {
  const router = useRouter();
  const [locations, setLocations] = useState<GbpLocationOption[]>([]);
  const [savedMapping, setSavedMapping] = useState<GbpSavedMapping | null>(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "idle" | "success" | "error";
    text: string;
  }>({
    type: "idle",
    text: "Map this project to a verified Google Business Profile location when local evidence is available.",
  });

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/projects/gbp-mapping-options?project=${encodeURIComponent(
            projectSlug,
          )}`,
          { cache: "no-store" },
        );
        const payload =
          (await response.json().catch(() => ({}))) as MappingOptionsResponse;

        if (!active) return;

        setLocations(payload.locations ?? []);
        setSavedMapping(payload.savedMapping ?? null);
        setLocationName(payload.savedMapping?.locationName ?? "");

        if (!payload.ok && payload.error) {
          setMessage({ type: "error", text: payload.error });
        } else if (payload.savedMapping) {
          setMessage({
            type: "success",
            text: "Business Profile location mapping is saved for this project.",
          });
        } else {
          setMessage({
            type: "idle",
            text:
              payload.reason ??
              "Select a Business Profile location when discovery returns available locations.",
          });
        }
      } catch (error) {
        if (!active) return;
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load Business Profile locations.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    return () => {
      active = false;
    };
  }, [projectSlug]);

  async function saveMapping() {
    try {
      setSaving(true);
      const response = await fetch("/api/projects/update-gbp-mapping", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          project: projectSlug,
          locationName,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload?.error ?? "Failed to save Business Profile mapping.",
        );
      }

      setSavedMapping(payload.mapping);
      const result = await syncProjectSources(projectSlug, ["gbp"]);
      setMessage({ type: result.ok ? "success" : "error", text: `Business Profile mapping saved. ${result.message}` });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save Business Profile mapping.",
      });
    } finally {
      setSaving(false);
    }
  }

  const selectedLocation = locations.find((item) => item.id === locationName);
  const noLocations = !loading && locations.length === 0;

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,31,57,0.9),rgba(4,16,33,0.96))] px-8 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[30px] font-semibold tracking-[-0.03em] text-white">
            Business Profile mapping
          </h2>
          <p className="mt-3 max-w-[900px] text-[17px] leading-8 text-white/66">
            Connect {projectLabel} to a Google Business Profile location for
            local visibility evidence.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/4 px-5 py-3 text-[15px] text-white/72">
          {savedMapping ? "Mapped" : "Optional"}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="rounded-[22px] border border-white/10 bg-black/12 p-5">
          <div className="text-[12px] uppercase tracking-[0.22em] text-white/42">
            GBP location
          </div>
          <select
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            disabled={loading || saving}
            className="mt-4 h-14 w-full rounded-[16px] border border-white/12 bg-white/4 px-4 text-[16px] text-white outline-none"
          >
            <option value="">Select Business Profile location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>

          <div className="mt-4 text-[14px] leading-7 text-white/56">
            Saved value: {savedMapping?.displayName ?? "Not mapped"}
          </div>

          {selectedLocation ? (
            <div className="mt-2 text-[13px] leading-6 text-white/48">
              {locationContext(selectedLocation) || selectedLocation.id}
            </div>
          ) : null}

          {noLocations ? (
            <div className="mt-3 text-[14px] leading-6 text-white/58">
              No Business Profile locations were discovered for the connected
              Google account.
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={saveMapping}
          disabled={loading || saving || !locationName}
          className="h-14 self-end rounded-[18px] border border-cyan-300/30 bg-cyan-300/10 px-7 text-[16px] font-semibold text-cyan-100 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save GBP mapping"}
        </button>
      </div>

      {savedMapping && (
        <button type="button" disabled={saving} onClick={async () => {
          setSaving(true);
          try {
            const result = await syncProjectSources(projectSlug, ["gbp"]);
            setMessage({ type: result.ok ? "success" : "error", text: result.message });
            router.refresh();
          } finally { setSaving(false); }
        }} className="mt-4 rounded-[14px] border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60">
          {saving ? "Syncing..." : "Sync Business Profile now"}
        </button>
      )}

      <div
        className={`mt-5 rounded-[18px] border px-4 py-3 text-[14px] leading-7 ${
          message.type === "error"
            ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
            : message.type === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
              : "border-white/10 bg-white/4 text-white/64"
        }`}
      >
        {message.text}
      </div>
    </section>
  );
}
