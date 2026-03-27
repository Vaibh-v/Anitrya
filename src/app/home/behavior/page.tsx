import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getWorkspaceIntelligence } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function BehaviorPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return <div className="text-white">Authentication state is missing.</div>;
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  const [properties, lastRun, intelligence] = await Promise.all([
    prisma.ga4Property.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { displayName: "asc" }
    }),
    prisma.syncRun.findFirst({
      where: {
        workspaceId: workspace.id,
        source: "GOOGLE_GA4"
      },
      orderBy: { startedAt: "desc" }
    }),
    getWorkspaceIntelligence(workspace.id)
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="section-kicker">Behavior intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Behavior</h1>
        <p className="mt-3 max-w-4xl body-muted">
          On-site performance, engagement quality, and acquisition integrity from
          the synced GA4 layer.
        </p>
      </div>

      <div className="ai-highlight">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-accent">Anitrya behavior read</span>
          <span className="badge">
            {intelligence.behaviorInsights[0]?.confidence ?? "medium"} confidence
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          {intelligence.behaviorInsights[0]?.title ??
            "Behavior data is connected, but no strong behavior-specific conclusion is dominant yet."}
        </h2>
        <p className="mt-2 max-w-4xl text-sm body-muted">
          {intelligence.behaviorInsights[0]?.summary ??
            "Continue syncing and allow additional windows to sharpen the signal."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="card">
          <div className="section-title">Connection</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="badge badge-success">Connected</span>
            <span className="badge">{properties.length} discovered properties</span>
            {lastRun ? (
              <span className="badge">
                Last sync: {lastRun.status} · {lastRun.rowsSynced} rows
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex gap-3">
            <form action="/api/anitrya/ga4/discover" method="post">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                Discover Properties
              </button>
            </form>
            <form action="/api/anitrya/ga4/sync" method="post">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                Run Sync
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="section-title">What the system is watching</div>
          <div className="mt-4 space-y-3">
            {(intelligence.behaviorInsights[0]?.watchNext ?? [
              "Engagement by landing page",
              "Users by source",
              "Session quality on growth pages"
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
          <div className="section-title">Behavior findings</div>
          <div className="mt-5 insight-grid">
            {intelligence.behaviorInsights.length === 0 ? (
              <div className="card-soft text-sm body-muted">
                No strong behavior-specific finding is available yet.
              </div>
            ) : (
              intelligence.behaviorInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="insight-block">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-accent">Behavior</span>
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
          <div className="section-title">Discovered properties</div>
          <div className="mt-4 overflow-hidden rounded-2xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td>{property.displayName ?? property.propertyName}</td>
                    <td className="body-muted">{property.accountName}</td>
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