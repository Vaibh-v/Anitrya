import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getOverviewEvidenceSummary } from "@/lib/evidence/normalized-overview-store";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";
import type { IntelligenceRunOutput } from "@/lib/intelligence/contracts";
import { EmptyState, KpiGrid, PageHeading, formatNumber, resolveRange } from "@/components/dashboard/PageParts";

type PageProps = {
  searchParams?: Promise<{ project?: string; from?: string; to?: string; preset?: string }>;
};

const SEVERITY_TAG: Record<string, string> = {
  high: "eye-tag-amber",
  critical: "eye-tag-amber",
  medium: "",
  low: "eye-tag-green",
};

export default async function IntelligencePage(props: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) redirect("/");

  const params = (await props.searchParams) ?? {};
  const { from, to } = resolveRange(params);
  const project = await getProjectMapping({ ref: params.project ?? null, workspaceId });
  const summary = await getOverviewEvidenceSummary({ workspaceId, projectId: project.projectSlug, from, to });

  // Rule-based and read-only: computed live from stored evidence, never persisted from this page.
  let output: IntelligenceRunOutput = { insights: [], recommendations: [] };
  let failure: string | null = null;
  try {
    output = await runIntelligence({
      workspaceId,
      projectId: project.projectId,
      projectSlug: project.projectSlug,
      projectLabel: project.projectLabel,
      from,
      to,
    });
  } catch (error) {
    failure = error instanceof Error ? error.message : "Intelligence could not be generated.";
  }

  const groups = [
    { label: "GA4 sources", rows: summary.ga4SourceRows },
    { label: "GA4 landing pages", rows: summary.ga4LandingRows },
    { label: "Search queries", rows: summary.gscQueryRows },
    { label: "Search pages", rows: summary.gscPageRows },
    { label: "Google Ads campaigns", rows: summary.googleAdsCampaignRows },
    { label: "Business Profile", rows: summary.gbpLocationRows },
  ];
  const covered = groups.filter((group) => group.rows > 0).length;
  const insights = [...output.insights].sort((a, b) => b.priorityScore - a.priorityScore);
  const recommendations = [...output.recommendations].sort((a, b) => a.priority - b.priority || b.priorityScore - a.priorityScore);
  const settingsHref = `/home/settings?project=${encodeURIComponent(project.projectSlug)}`;

  return (
    <main className="eye-dashboard eye-page">
      <div className="eye-column">
        <PageHeading
          overline="Anitrya / Intelligence"
          title="Intelligence read"
          description="Ranked findings that compare this period with the previous one, each with its impact, confidence and exact next step."
          projectLabel={project.projectLabel}
          from={from}
          to={to}
        />

        {failure ? <EmptyState title="Intelligence unavailable" body={failure} href={settingsHref} action="Check sources" /> : null}
        {!failure && insights.length === 0 ? (
          <EmptyState title="No findings yet" body="There isn't enough evidence in this range to form a finding. Sync sources or widen the date range." href={settingsHref} action="Run sync" />
        ) : null}

        <KpiGrid
          items={[
            { label: "Findings", value: String(insights.length), note: "Ranked by priority score", accent: "cyan" },
            { label: "Recommendations", value: String(recommendations.length), note: "Actions tied to findings", accent: "violet" },
            { label: "Evidence coverage", value: `${covered}/${groups.length}`, note: "Source groups with rows", accent: "green" },
            {
              label: "Evidence rows",
              value: formatNumber(groups.reduce((total, group) => total + group.rows, 0)),
              note: "Available to reasoning",
              accent: "amber",
            },
          ]}
        />

        <article className="eye-panel">
          <h2>Findings <span className="eye-tag">{insights.length}</span></h2>
          <div className="eye-findings">
            {insights.map((insight, index) => (
              <div key={insight.insightId} className="eye-finding">
                <div className="eye-finding-head">
                  <span className="eye-finding-rank eye-mono">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{insight.title}</strong>
                  <span className={`eye-tag ${SEVERITY_TAG[insight.severity] ?? ""}`}>{insight.severity}</span>
                </div>
                <p>{insight.finding}</p>
                {insight.rows && insight.rows.length > 0 ? (
                  <div className="eye-table-wrap">
                    <table className="eye-table eye-finding-table">
                      {insight.rowHeaders ? (
                        <thead>
                          <tr>
                            {insight.rowHeaders.map((header, i) => (
                              <th key={header} className={i === 0 ? "" : "eye-num"}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {insight.rows.map((row) => (
                          <tr key={row.label}>
                            <td className="eye-cell-label" title={row.label}>{row.label}</td>
                            {row.values.map((value, i) => (
                              <td key={i} className="eye-num eye-mono">{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <p className="eye-finding-action"><span>Do this</span>{insight.recommendedAction}</p>
                {insight.rationale ? <p className="eye-finding-muted">{insight.rationale}</p> : null}
                <div className="eye-finding-foot">
                  {insight.impactValue ? <span>Impact ≈ {formatNumber(insight.impactValue)} {insight.impactUnit}</span> : null}
                  {typeof insight.confidence === "number" ? <span>Confidence {Math.round(insight.confidence * 100)}%</span> : <span>Data: {insight.dataSufficiency}</span>}
                  <span>Priority {insight.priorityScore}</span>
                </div>
              </div>
            ))}
            {insights.length === 0 ? <p className="eye-panel-text">No findings for this range.</p> : null}
          </div>
        </article>
      </div>

      <aside className="eye-column">
        <article className="eye-panel eye-next">
          <h2>Recommended actions</h2>
          <div className="eye-section">
            {recommendations.length === 0 ? <p className="eye-panel-text">No actions yet.</p> : null}
            {recommendations.map((rec) => (
              <div key={rec.recommendationId} className="eye-row">
                <span>P{rec.priority}</span>
                <span>
                  <strong>{rec.title}</strong>
                  <br />
                  {rec.action}
                  {rec.expectedOutcome ? <><br /><em className="eye-finding-muted">{rec.expectedOutcome}</em></> : null}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="eye-panel">
          <h2>Evidence coverage</h2>
          <div className="eye-section">
            {groups.map((group) => (
              <div key={group.label} className="eye-row">
                <span>{group.label}</span>
                <strong className="eye-mono">{group.rows ? formatNumber(group.rows) : "—"}</strong>
              </div>
            ))}
          </div>
          <div className="eye-actions">
            <a className="eye-secondary" href={settingsHref}>Manage sources</a>
          </div>
        </article>
      </aside>
    </main>
  );
}
