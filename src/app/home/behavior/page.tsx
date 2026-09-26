import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getBehaviorDetail } from "@/lib/evidence/page-insights";
import {
  EmptyState,
  KpiGrid,
  PageHeading,
  RankedTable,
  formatNumber,
  formatPercent,
  resolveRange,
} from "@/components/dashboard/PageParts";

type PageProps = {
  searchParams?: Promise<{ project?: string; from?: string; to?: string; preset?: string }>;
};

export default async function BehaviorPage(props: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) redirect("/");

  const params = (await props.searchParams) ?? {};
  const { from, to } = resolveRange(params);
  const project = await getProjectMapping({ ref: params.project ?? null, workspaceId });
  const behavior = await getBehaviorDetail({ workspaceId, projectSlug: project.projectSlug, from, to });
  const settingsHref = `/home/settings?project=${encodeURIComponent(project.projectSlug)}`;
  const engagementRate = behavior.sessions > 0 ? behavior.engagedSessions / behavior.sessions : 0;
  const maxSource = Math.max(1, ...behavior.topSources.map((row) => row.primary));
  const maxLanding = Math.max(1, ...behavior.topLandingPages.map((row) => row.primary));
  const columns = [
    { label: "Sessions", align: "right" as const },
    { label: "Users", align: "right" as const },
    { label: "Engaged", align: "right" as const },
    { label: "Conv.", align: "right" as const },
  ];

  return (
    <main className="eye-dashboard eye-page">
      <div className="eye-column">
        <PageHeading
          overline="Anitrya / Behavior"
          title="Behavior evidence"
          description="Acquisition mix and landing-page quality from normalized GA4 evidence for the selected project and range."
          projectLabel={project.projectLabel}
          from={from}
          to={to}
        />

        {!project.ga4PropertyId ? (
          <EmptyState title="No GA4 property mapped" body="Map a GA4 property to this project to collect traffic and landing-page evidence." href={settingsHref} action="Map sources" />
        ) : behavior.sourceRows === 0 ? (
          <EmptyState title="No behavior evidence in this range" body={`${project.ga4PropertyLabel ?? "The GA4 property"} is mapped, but no rows are stored for ${from} → ${to}.`} href={settingsHref} action="Run sync" />
        ) : null}

        <KpiGrid
          items={[
            { label: "Sessions", value: formatNumber(behavior.sessions), note: "All sources in range", accent: "cyan" },
            { label: "Users", value: formatNumber(behavior.users), note: "Summed by source/day", accent: "violet" },
            { label: "Engagement rate", value: formatPercent(engagementRate), note: "Engaged ÷ sessions", accent: "green" },
            { label: "Conversions", value: formatNumber(behavior.conversions), note: "Key events", accent: "amber" },
          ]}
        />

        <div className="eye-split">
          <RankedTable
            title="Traffic sources"
            tag={`${formatNumber(behavior.sourceRows)} rows`}
            columns={[{ label: "Source / medium" }, ...columns]}
            rows={behavior.topSources.map((row) => ({
              key: row.label,
              bar: row.primary / maxSource,
              cells: [row.label, formatNumber(row.primary), formatNumber(row.secondary), formatPercent(row.tertiary ?? 0), formatNumber(row.quaternary ?? 0)],
            }))}
            empty="No source evidence for this range yet."
          />
          <RankedTable
            title="Landing pages"
            tag={`${formatNumber(behavior.landingRows)} rows`}
            columns={[{ label: "Landing page" }, ...columns]}
            rows={behavior.topLandingPages.map((row) => ({
              key: row.label,
              bar: row.primary / maxLanding,
              cells: [row.label || "/", formatNumber(row.primary), formatNumber(row.secondary), formatPercent(row.tertiary ?? 0), formatNumber(row.quaternary ?? 0)],
            }))}
            empty="No landing-page evidence for this range yet."
          />
        </div>
      </div>

      <aside className="eye-column">
        <article className="eye-panel">
          <h2>Source <span className={`eye-tag ${project.ga4PropertyId ? "eye-tag-green" : "eye-tag-amber"}`}>{project.ga4PropertyId ? "Mapped" : "Not mapped"}</span></h2>
          <div className="eye-section">
            <div className="eye-row"><span>GA4 property</span><strong>{project.ga4PropertyLabel ?? "—"}</strong></div>
            <div className="eye-row"><span>Source rows</span><strong className="eye-mono">{formatNumber(behavior.sourceRows)}</strong></div>
            <div className="eye-row"><span>Landing rows</span><strong className="eye-mono">{formatNumber(behavior.landingRows)}</strong></div>
          </div>
          <p className="eye-panel-text">Users are summed across source/day rows, so they can exceed unique users reported inside GA4.</p>
        </article>
        <article className="eye-panel eye-next">
          <h2>Next actions</h2>
          <div className="eye-section">
            {[
              behavior.sourceRows === 0 ? "Run a sync from Settings for this range." : "Find landing pages with high sessions but low engagement.",
              "Check whether paid or organic sources drive the conversions.",
              "Compare with SEO top pages to separate ranking from on-page issues.",
            ].map((action, index) => (
              <div key={action} className="eye-row"><span>{String(index + 1).padStart(2, "0")}</span><span>{action}</span></div>
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
