import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import {
  getWorkspaceIntelligence,
  type IntelligenceResponse
} from "@/lib/intelligence";

export const dynamic = "force-dynamic";

function deltaLabel(value: number | null) {
  if (value === null) return "Insufficient comparison window";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function toneClass(tone: "neutral" | "positive" | "negative") {
  if (tone === "positive") return "badge-success";
  if (tone === "negative") return "badge-danger";
  return "badge";
}

function severityClass(severity: "opportunity" | "risk" | "watch") {
  if (severity === "opportunity") return "badge-success";
  if (severity === "risk") return "badge-danger";
  return "badge-warning";
}

export default async function IntelligencePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return <div className="text-white">Authentication state is missing.</div>;
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  let intelligence: IntelligenceResponse | null = null;
  let errorMessage: string | null = null;

  try {
    intelligence = await getWorkspaceIntelligence(workspace.id);
  } catch (error: unknown) {
    errorMessage =
      error instanceof Error ? error.message : "UNKNOWN_INTELLIGENCE_ERROR";
  }

  if (!intelligence || errorMessage) {
    return (
      <div className="space-y-8">
        <div>
          <div className="section-kicker">Anitrya Intelligence</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Intelligence</h1>
          <p className="mt-3 max-w-3xl body-muted">
            Evidence-backed synthesis across synced sources.
          </p>
        </div>

        <div className="card border-red-500/20 bg-red-500/5 text-sm text-red-200">
          Intelligence is not available yet.
          <div className="mt-2 text-red-300/80">
            {errorMessage ?? "UNKNOWN_INTELLIGENCE_ERROR"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="section-kicker">Anitrya Intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Intelligence</h1>
        <p className="mt-3 max-w-4xl body-muted">
          This layer combines source evidence, directional shifts, and diagnostic logic
          to surface what appears to matter most now, why it matters, and what should be
          done next.
        </p>
      </div>

      <div className="ai-highlight">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-accent">Executive read</span>
          <span className="badge">{intelligence.executive.confidence} confidence</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {intelligence.executive.headline}
        </h2>
        <p className="mt-2 max-w-4xl text-sm body-muted">
          {intelligence.executive.narrative}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {intelligence.executive.topActions.map((action, index) => (
            <div key={`${action}-${index}`} className="card-soft text-sm">
              {action}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {intelligence.overviewCards.map((card) => (
          <div key={card.label} className="metric-card">
            <div className="section-title">{card.label}</div>
            <div className="metric-value mt-2">{card.value}</div>
            <div className="mt-3">
              <span className={`badge ${toneClass(card.tone)}`}>
                {deltaLabel(card.delta)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">Coverage posture</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card-soft">
            <div className="font-medium">GA4</div>
            <div className="mt-3 text-sm body-muted">
              {intelligence.coverage.ga4.properties} properties · {intelligence.coverage.ga4.rows} rows
            </div>
          </div>
          <div className="card-soft">
            <div className="font-medium">GSC</div>
            <div className="mt-3 text-sm body-muted">
              {intelligence.coverage.gsc.sites} sites · {intelligence.coverage.gsc.rows} rows
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm body-subtle">
          Confidence improves when multiple sources move together, when coverage is broad enough,
          and when the same pattern persists across consecutive windows.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-title">Cross-source diagnosis</div>
              <h3 className="mt-2 text-xl font-semibold">Signals that deserve attention</h3>
            </div>
            <span className="badge badge-accent">
              {intelligence.crossSourceInsights.length} findings
            </span>
          </div>

          <div className="mt-5 insight-grid">
            {intelligence.crossSourceInsights.length === 0 ? (
              <div className="card-soft text-sm body-muted">
                No strong cross-source conclusion is available yet. The system is still seeing more
                movement than agreement.
              </div>
            ) : (
              intelligence.crossSourceInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="insight-block">
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${severityClass(insight.severity)}`}>
                      {insight.severity}
                    </span>
                    <span className="badge">{insight.confidence} confidence</span>
                  </div>

                  <h4 className="mt-3 text-lg font-semibold">{insight.title}</h4>
                  <p className="mt-2 text-sm body-muted">{insight.summary}</p>

                  <div className="mt-4">
                    <div className="text-sm font-medium">Why this matters</div>
                    <p className="mt-2 text-sm body-muted">{insight.whyItMatters}</p>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium">Evidence</div>
                    <ul className="mt-2 space-y-1 text-sm body-muted">
                      {insight.evidence.map((item, evidenceIndex) => (
                        <li key={`${item}-${evidenceIndex}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium">What to do next</div>
                    <ul className="mt-2 space-y-1 text-sm body-muted">
                      {insight.actions.map((action, actionIndex) => (
                        <li key={`${action}-${actionIndex}`}>• {action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium">Watch next</div>
                    <ul className="mt-2 space-y-1 text-sm body-muted">
                      {insight.watchNext.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-title">SEO intelligence</div>
              <h3 className="mt-2 text-xl font-semibold">Search-side interpretation</h3>
            </div>
            <span className="badge badge-accent">{intelligence.seoInsights.length} findings</span>
          </div>

          <div className="mt-5 insight-grid">
            {intelligence.seoInsights.length === 0 ? (
              <div className="card-soft text-sm body-muted">
                No strong SEO-specific conclusion is available yet.
              </div>
            ) : (
              intelligence.seoInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="insight-block">
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${severityClass(insight.severity)}`}>
                      {insight.severity}
                    </span>
                    <span className="badge">{insight.confidence} confidence</span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold">{insight.title}</h4>
                  <p className="mt-2 text-sm body-muted">{insight.summary}</p>
                  <div className="mt-4 text-sm font-medium">Why this matters</div>
                  <p className="mt-2 text-sm body-muted">{insight.whyItMatters}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-title">Behavior intelligence</div>
              <h3 className="mt-2 text-xl font-semibold">On-site interpretation</h3>
            </div>
            <span className="badge badge-accent">
              {intelligence.behaviorInsights.length} findings
            </span>
          </div>

          <div className="mt-5 insight-grid">
            {intelligence.behaviorInsights.length === 0 ? (
              <div className="card-soft text-sm body-muted">
                No strong behavior-specific conclusion is available yet.
              </div>
            ) : (
              intelligence.behaviorInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="insight-block">
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${severityClass(insight.severity)}`}>
                      {insight.severity}
                    </span>
                    <span className="badge">{insight.confidence} confidence</span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold">{insight.title}</h4>
                  <p className="mt-2 text-sm body-muted">{insight.summary}</p>
                  <div className="mt-4 text-sm font-medium">Why this matters</div>
                  <p className="mt-2 text-sm body-muted">{insight.whyItMatters}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}