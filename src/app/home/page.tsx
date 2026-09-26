import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignalGlobe } from "@/components/dashboard/SignalGlobe";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getOverviewEvidenceSummary } from "@/lib/evidence/normalized-overview-store";
import { getBehaviorDetail, getSeoDetail } from "@/lib/evidence/page-insights";

type PageProps = {
  searchParams?: Promise<{ project?: string; from?: string; to?: string; preset?: string }>;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function HomePage(props: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) throw new Error("Missing workspace context on the current session.");

  const params = (await props.searchParams) ?? {};
  const today = new Date();
  const start = new Date(today);
  const days = params.preset === "7d" ? 7 : params.preset === "90d" ? 90 : 30;
  start.setUTCDate(start.getUTCDate() - days + 1);
  const from = params.from ?? formatDate(start);
  const to = params.to ?? formatDate(today);
  const projectRef = params.project ?? null;

  let project: Awaited<ReturnType<typeof getProjectMapping>> | null = null;
  let projectError = false;
  try {
    project = await getProjectMapping({ ref: projectRef, workspaceId });
  } catch {
    projectError = true;
  }

  const summary = project
    ? await getOverviewEvidenceSummary({ workspaceId, projectId: project.projectSlug, from, to })
    : { ga4SourceRows: 0, ga4LandingRows: 0, gscQueryRows: 0, gscPageRows: 0, googleAdsCampaignRows: 0, gbpLocationRows: 0, failureReason: null };

  const scope = project ? { workspaceId, projectSlug: project.projectSlug, from, to } : null;
  const [seo, behavior] = scope
    ? await Promise.all([getSeoDetail(scope), getBehaviorDetail(scope)])
    : [null, null];
  const performance = [
    { label: "Sessions", value: behavior?.sessions ?? 0, note: "GA4, all sources", color: "cyan" },
    { label: "Conversions", value: behavior?.conversions ?? 0, note: "GA4 key events", color: "violet" },
    { label: "Organic clicks", value: seo?.clicks ?? 0, note: "Search Console", color: "green" },
    { label: "Impressions", value: seo?.impressions ?? 0, note: "Search Console", color: "amber" },
  ];

  const sources = [
    { name: "GA4 source rows", count: summary.ga4SourceRows, color: "cyan" },
    { name: "GA4 landing rows", count: summary.ga4LandingRows, color: "violet" },
    { name: "GSC query rows", count: summary.gscQueryRows, color: "green" },
    { name: "GSC page rows", count: summary.gscPageRows, color: "amber" },
    { name: "Google Ads campaign rows", count: summary.googleAdsCampaignRows, color: "cyan" },
    { name: "Business Profile rows", count: summary.gbpLocationRows, color: "violet" },
  ];
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  const available = sources.filter((source) => source.count > 0).length;
  const coverage = Math.round(available / sources.length * 100);
  const unavailable = projectError || Boolean(summary.failureReason);
  const actions = unavailable
    ? ["Restore access to the project mapping and evidence store.", "Verify the database connection and reload the dashboard."]
    : sources.filter((source) => source.count === 0).map((source) => {
        const name = source.name.replace(" rows", "");
        if (name.startsWith("Google Ads")) return "Map a Google Ads customer in Settings to add campaign evidence.";
        if (name.startsWith("Business Profile")) return "Map a Business Profile location in Settings to add local evidence.";
        return `Sync ${name} evidence for this project.`;
      });
  if (!unavailable && actions.length === 0) actions.push("Review cross-source evidence and validate the next intelligence hypothesis.");

  const query = new URLSearchParams({ project: project?.projectSlug ?? projectRef ?? "", from, to });
  const destination = (route: string) => `${route}?${query.toString()}`;

  return (
    <main className="eye-dashboard">
      <div className="eye-dashboard-grid">
        <div className="eye-column">
          <div className="eye-heading">
            <div>
              <span className="eye-overline">Anitrya / God&apos;s Eye</span>
              <h1>Market intelligence</h1>
              <p>See the evidence behind every decision. The map is a visual surface; location signals are not yet connected.</p>
            </div>
            <div className="eye-heading-project">
              <span>Active project</span>
              <strong>{project?.projectLabel ?? "Unavailable"}</strong>
              <small>{from} → {to}</small>
            </div>
          </div>

          {unavailable && (
            <div className="eye-alert" role="alert">
              <strong>{projectError ? "Project mapping unavailable" : "Evidence store unavailable"}</strong>
              <span>We can&apos;t read this project&apos;s current evidence. Check its database connection before interpreting these numbers.</span>
              <Link href={destination("/home/settings")}>Review project settings →</Link>
            </div>
          )}

          <section className="eye-kpis eye-kpis-4" aria-label="Performance summary">
            {performance.map((item) => (
              <div className="eye-panel eye-kpi" key={item.label}>
                <h2>{item.label}</h2>
                <strong className="eye-mono">{unavailable ? "—" : item.value.toLocaleString()}</strong>
                <span>{unavailable ? "Unavailable" : item.note}</span>
                <span className={`eye-kpi-accent eye-spark-${item.color}`} aria-hidden="true" />
              </div>
            ))}
          </section>

          <p className="eye-overline eye-subhead">Evidence stored for this range</p>
          <section className="eye-kpis eye-kpis-compact" aria-label="Evidence summary">
            {sources.map((source) => (
              <div className="eye-panel eye-kpi" key={source.name}>
                <h2>{source.name}</h2>
                <strong className="eye-mono">{unavailable ? "—" : source.count.toLocaleString()}</strong>
                <span>{unavailable ? "Unavailable" : source.count ? "Rows in selected range" : "Awaiting sync"}</span>
                <span className={`eye-kpi-accent eye-spark-${source.color}`} aria-hidden="true" />
              </div>
            ))}
          </section>

          <SignalGlobe key={project?.projectSlug ?? "missing"} projectLabel={project?.projectLabel ?? "No project"} searchRows={unavailable ? 0 : summary.gscQueryRows + summary.gscPageRows} trafficRows={unavailable ? 0 : summary.ga4SourceRows + summary.ga4LandingRows} paidRows={unavailable ? 0 : summary.googleAdsCampaignRows} localRows={unavailable ? 0 : summary.gbpLocationRows} />

          <section className="eye-bento" aria-label="Intelligence modules">
            <div className="eye-panel">
              <h2>Competitor watch <span className="eye-tag">No map feed</span></h2>
              <p className="eye-panel-text">No verified competitor events are available in this overview. GA4 and GSC row counts do not establish competitor changes.</p>
              <Link href={destination("/home/intelligence")} className="eye-inline-link">Explore intelligence →</Link>
            </div>
            <div className="eye-panel">
              <h2>Customer voice <span className="eye-tag">No map feed</span></h2>
              <p className="eye-panel-text">Reviews and conversation evidence aren&apos;t part of this summary. Check connected sources before drawing conclusions about sentiment.</p>
              <Link href={destination("/home/settings")} className="eye-inline-link">Manage connections →</Link>
            </div>
            <div className="eye-panel">
              <h2>Outcomes and learning <span className="eye-tag">No data in overview</span></h2>
              <p className="eye-panel-text">Track actual recommendations and outcomes in the intelligence workspace. This card doesn&apos;t infer results or savings from source-row counts.</p>
              <Link href={destination("/home/intelligence")} className="eye-inline-link">Review outcomes →</Link>
            </div>
          </section>

          <section className="eye-panel eye-pipeline">
            <h2>Pipeline status <span className="eye-tag">Evidence, not connection health</span></h2>
            <div className="eye-pipeline-steps">
              {["Integrations", "Collection", "GA4", "Search Console", "Google Ads", "Business Profile", "Reasoning", "Outcomes"].map((stage) => <span key={stage}>{stage}</span>)}
            </div>
            <p>GA4 and GSC counts above reflect stored evidence. Check Settings for actual provider connection and sync health.</p>
          </section>
        </div>

        <aside className="eye-column" aria-label="Decision workspace">
          <section className="eye-panel eye-decision">
            <h2>Decision brief <span className="eye-tag eye-tag-amber">Evidence-based</span></h2>
            <div className="eye-decision-heading">
              <div className="eye-ring" style={{ background: `conic-gradient(#5cf2ff ${coverage}%, rgba(255,255,255,.08) 0)` }}>
                <span className="eye-mono">{unavailable ? "—" : `${coverage}%`}</span>
              </div>
              <div><h3>{unavailable ? "Data unavailable" : total ? "Evidence is ready for review" : "Build your evidence base"}</h3><p>Coverage of four normalized GA4 and GSC evidence groups</p></div>
            </div>
            <div className="eye-tags">
              <span className="eye-tag">{project?.projectLabel ?? "No project"}</span>
              <span className="eye-tag eye-tag-green">Verified row counts</span>
              <span className="eye-tag eye-tag-amber">{unavailable ? "Unknown" : `${total.toLocaleString()} rows`}</span>
            </div>
            <div className="eye-section"><h4>What changed</h4><p>Changes over time require a comparison period. This view reports only the selected range, not a trend or a forecast.</p></div>
            <div className="eye-section"><h4>Evidence</h4>
              {sources.map((source) => <div className="eye-row" key={source.name}><span>{source.name}</span><strong className="eye-mono">{unavailable ? "—" : source.count.toLocaleString()}</strong></div>)}
            </div>
            <div className="eye-section"><h4>How it reasoned</h4>
              <div className="eye-reasoning">
                <div><b>Observed</b>{unavailable ? "Evidence is unreachable" : `${available} of 4 groups have data`}</div>
                <div><b>Unknown</b>Location, customer voice and competitor changes</div>
                <div><b>Next view</b>Review detailed intelligence before approving action</div>
              </div>
            </div>
            <div className="eye-section"><h4>Recommended action</h4><p>{actions[0]}</p></div>
            <div className="eye-actions">
              <Link className="eye-primary" href={destination("/home/intelligence")}>Open intelligence</Link>
              <Link className="eye-secondary" href={destination("/home/settings")}>Manage sources</Link>
            </div>
          </section>

          <section className="eye-panel eye-next">
            <h2>Next actions <span className="eye-tag">{actions.length} to review</span></h2>
            {actions.map((action, index) => <div className="eye-row" key={action}><span className="eye-mono">0{index + 1}</span><span>{action}</span></div>)}
          </section>

          <section className="eye-panel eye-copilot">
            <h2>Analyst copilot <span className="eye-tag">Not connected</span></h2>
            <p className="eye-chat-bubble">I can show which evidence groups are available. Conversational answers need a connected reasoning service and source-level citations.</p>
            <div className="eye-suggestions">
              <Link href={destination("/home/seo")}>Explore search evidence ↗</Link>
              <Link href={destination("/home/behavior")}>Explore behavior ↗</Link>
            </div>
            <div className="eye-chat-input"><span>Ask about your market</span><button type="button" disabled title="Copilot is not connected">Send</button></div>
          </section>
        </aside>
      </div>
    </main>
  );
}
