export type SyncSource = "ga4" | "gsc" | "google-ads" | "gbp" | "semrush";

export async function syncProjectSources(project: string, sources: SyncSource[]) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  const range = { project, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };

  const results = await Promise.all(sources.map(async (source) => {
    try {
      // Project-scoped runner endpoint (server-side). The legacy
      // /api/anitrya/{ga4,gsc}/sync routes are workspace-wide and do not
      // return { ok }, so they cannot be used here.
      const response = await fetch(`/api/sync/provider?source=${encodeURIComponent(source)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(range),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.result?.status === "skipped") {
        return { ok: true, message: `${source}: skipped - ${payload.result.reason}` };
      }
      if (!response.ok || !payload.ok) {
        return { ok: false, message: `${source}: ${payload.result?.reason ?? payload.error ?? `Sync failed (${response.status})`}` };
      }
      return { ok: true, message: `${source}: ${payload.result?.rowsSynced ?? 0} rows synced` };
    } catch (error) {
      return { ok: false, message: `${source}: ${error instanceof Error ? error.message : "Network error"}` };
    }
  }));

  return { ok: results.every((result) => result.ok), message: results.map((result) => result.message).join(" · ") };
}
