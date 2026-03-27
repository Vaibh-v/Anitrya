import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { getWorkspaceIntelligence } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

function deltaLabel(value: number | null) {
  if (value === null) return "Insufficient history";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return <div className="text-white">Authentication state is missing.</div>;
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  const intelligence = await getWorkspaceIntelligence(workspace.id);

  return (
    <div className="space-y-8">
      <div>
        <div className="section-kicker">Workspace overview</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-3 max-w-4xl body-muted">
          High-level state across connected sources, current directional movement,
          and the most important issue the system sees right now.
        </p>
      </div>

      <div className="ai-highlight">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-accent">Top system read</span>
          <span className="badge">{intelligence.executive.confidence} confidence</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{intelligence.executive.headline}</h2>
        <p className="mt-2 max-w-4xl text-sm body-muted">
          {intelligence.executive.narrative}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {intelligence.overviewCards.map((card) => (
          <div key={card.label} className="metric-card">
            <div className="section-title">{card.label}</div>
            <div className="metric-value mt-2">{card.value}</div>
            <div className="mt-3">
              <span className="badge">{deltaLabel(card.delta)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="section-title">Connected source posture</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="card-soft">
              <div className="font-medium">Google Search Console</div>
              <div className="mt-3 text-sm body-muted">
                Connected · {intelligence.coverage.gsc.sites} sites
              </div>
              <div className="mt-3 signal-bar">
                <span style={{ width: `${Math.min(100, intelligence.coverage.gsc.rows / 2)}%` }} />
              </div>
            </div>

            <div className="card-soft">
              <div className="font-medium">Google Analytics 4</div>
              <div className="mt-3 text-sm body-muted">
                Connected · {intelligence.coverage.ga4.properties} properties
              </div>
              <div className="mt-3 signal-bar">
                <span style={{ width: `${Math.min(100, intelligence.coverage.ga4.rows)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Priority actions</div>
          <div className="mt-5 space-y-3">
            {intelligence.executive.topActions.map((action, index) => (
              <div key={`${action}-${index}`} className="card-soft text-sm">
                {action}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Where to go next</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="card-soft">
            <div className="font-medium">SEO</div>
            <p className="mt-2 text-sm body-muted">
              Review search-side interpretation, result capture pressure, and visibility risk.
            </p>
          </div>
          <div className="card-soft">
            <div className="font-medium">Behavior</div>
            <p className="mt-2 text-sm body-muted">
              Review engagement quality, acquisition integrity, and on-site movement.
            </p>
          </div>
          <div className="card-soft">
            <div className="font-medium">Intelligence</div>
            <p className="mt-2 text-sm body-muted">
              Review Anitrya’s synthesized reading across all currently connected evidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}