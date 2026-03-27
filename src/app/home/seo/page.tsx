import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getWorkspaceIntelligence } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return <div className="text-white">Authentication state is missing.</div>;
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  const [sites, lastRun, intelligence] = await Promise.all([
    prisma.gscSite.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { siteUrl: "asc" }
    }),
    prisma.syncRun.findFirst({
      where: {
        workspaceId: workspace.id,
        source: "GOOGLE_GSC"
      },
      orderBy: { startedAt: "desc" }
    }),
    getWorkspaceIntelligence(workspace.id)
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="section-kicker">Search intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">SEO</h1>
        <p className="mt-3 max-w-4xl body-muted">
          Search-side visibility, click capture, and evidence-backed interpretation
          from the currently synced GSC layer.
        </p>
      </div>

      <div className="ai-highlight">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-accent">Anitrya SEO read</span>
          <span className="badge">
            {intelligence.seoInsights[0]?.confidence ?? "medium"} confidence
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          {intelligence.seoInsights[0]?.title ??
            "Search evidence is connected, but no strong SEO-specific conclusion is dominant yet."}
        </h2>
        <p className="mt-2 max-w-4xl text-sm body-muted">
          {intelligence.seoInsights[0]?.summary ??
            "Continue syncing and allow additional windows to sharpen the signal."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="card">
          <div className="section-title">Connection</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="badge badge-success">Connected</span>
            <span className="badge">{sites.length} discovered sites</span>
            {lastRun ? (
              <span className="badge">
                Last sync: {lastRun.status} · {lastRun.rowsSynced} rows
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex gap-3">
            <form action="/api/anitrya/gsc/discover" method="post">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                Discover Sites
              </button>
            </form>
            <form action="/api/anitrya/gsc/sync" method="post">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                Run Sync
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="section-title">What the system is watching</div>
          <div className="mt-4 space-y-3">
            {(intelligence.seoInsights[0]?.watchNext ?? [
              "CTR by high-impression page",
              "Position shifts across top pages",
              "Clicks by query cluster"
            ]).map((item, index) => (
              <div key={`${item}-${index}`} className="card-soft text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="card">
          <div className="section-title">SEO findings</div>
          <div className="mt-5 insight-grid">
            {intelligence.seoInsights.length === 0 ? (
              <div className="card-soft text-sm body-muted">
                No strong SEO-specific finding is available yet.
              </div>
            ) : (
              intelligence.seoInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="insight-block">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-accent">SEO</span>
                    <span className="badge">{insight.confidence} confidence</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{insight.title}</h3>
                  <p className="mt-2 text-sm body-muted">{insight.summary}</p>
                  <div className="mt-4 text-sm font-medium">Why this matters</div>
                  <p className="mt-2 text-sm body-muted">{insight.whyItMatters}</p>
                  <div className="mt-4 text-sm font-medium">Next steps</div>
                  <ul className="mt-2 space-y-1 text-sm body-muted">
                    {insight.actions.map((action, actionIndex) => (
                      <li key={`${action}-${actionIndex}`}>• {action}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Discovered sites</div>
          <div className="mt-4 overflow-hidden rounded-2xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.siteUrl}</td>
                    <td className="body-muted">{site.permissionLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}