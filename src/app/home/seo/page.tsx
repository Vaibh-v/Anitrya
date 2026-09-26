import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getSeoDetail } from "@/lib/evidence/page-insights";
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

/** Path only, unless the top pages span several hosts (www vs apex, http vs https) — then keep the host so rows stay distinguishable. */
function pageLabeler(urls: string[]) {
  const origins = new Set<string>();
  for (const url of urls) {
    try {
      origins.add(new URL(url).origin);
    } catch {
      /* not a URL */
    }
  }
  return (url: string) => {
    try {
      const parsed = new URL(url);
      const path = `${parsed.pathname}${parsed.search}` || "/";
      return origins.size > 1 ? `${parsed.protocol === "http:" ? "http://" : ""}${parsed.host}${path}` : path;
    } catch {
      return url;
    }
  };
}

export default async function SeoPage(props: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) redirect("/");

  const params = (await props.searchParams) ?? {};
  const { from, to } = resolveRange(params);
  const project = await getProjectMapping({ ref: params.project ?? null, workspaceId });
  const seo = await getSeoDetail({ workspaceId, projectSlug: project.projectSlug, from, to });
  const settingsHref = `/home/settings?project=${encodeURIComponent(project.projectSlug)}`;
  const maxQueryClicks = Math.max(1, ...seo.topQueries.map((row) => row.primary));
  const shortPath = pageLabeler(seo.topPages.map((row) => row.label));
  const maxPageClicks = Math.max(1, ...seo.topPages.map((row) => row.primary));

  return (
    <main className="eye-dashboard eye-page">
      <div className="eye-column">
        <PageHeading
          overline="Anitrya / Search"
          title="SEO evidence"
          description="Search demand and page visibility from normalized Search Console evidence for the selected project and range."
          projectLabel={project.projectLabel}
          from={from}
          to={to}
        />

        {!project.gscSiteUrl ? (
          <EmptyState title="No Search Console site mapped" body="Map a Search Console site to this project to collect query and page evidence." href={settingsHref} action="Map sources" />
        ) : seo.queryRows === 0 ? (
          <EmptyState title="No search evidence in this range" body={`${project.gscSiteUrl} is mapped, but no rows are stored for ${from} → ${to}.`} href={settingsHref} action="Run sync" />
        ) : null}

        <KpiGrid
          items={[
            { label: "Clicks", value: formatNumber(seo.clicks), note: "Organic clicks in range", accent: "cyan" },
            { label: "Impressions", value: formatNumber(seo.impressions), note: "Search appearances", accent: "violet" },
            { label: "CTR", value: formatPercent(seo.ctr, 2), note: "Clicks ÷ impressions", accent: "green" },
            { label: "Avg. position", value: seo.position ? seo.position.toFixed(1) : "—", note: "Impression-weighted", accent: "amber" },
          ]}
        />

        <div className="eye-split">
          <RankedTable
            title="Top queries"
            tag={`${formatNumber(seo.queryRows)} rows`}
            columns={[{ label: "Query" }, { label: "Clicks", align: "right" }, { label: "Impr.", align: "right" }, { label: "CTR", align: "right" }, { label: "Pos.", align: "right" }]}
            rows={seo.topQueries.map((row) => ({
              key: row.label,
              bar: row.primary / maxQueryClicks,
              cells: [row.label, formatNumber(row.primary), formatNumber(row.secondary), formatPercent(row.tertiary ?? 0), (row.quaternary ?? 0).toFixed(1)],
            }))}
            empty="No query evidence for this range yet."
          />
          <RankedTable
            title="Top pages"
            tag={`${formatNumber(seo.pageRows)} rows`}
            columns={[{ label: "Page" }, { label: "Clicks", align: "right" }, { label: "Impr.", align: "right" }, { label: "CTR", align: "right" }, { label: "Pos.", align: "right" }]}
            rows={seo.topPages.map((row) => ({
              key: row.label,
              bar: row.primary / maxPageClicks,
              cells: [<span key="p" title={row.label}>{shortPath(row.label)}</span>, formatNumber(row.primary), formatNumber(row.secondary), formatPercent(row.tertiary ?? 0), (row.quaternary ?? 0).toFixed(1)],
            }))}
            empty="No page evidence for this range yet."
          />
        </div>
      </div>

      <aside className="eye-column">
        <article className="eye-panel">
          <h2>Source <span className={`eye-tag ${project.gscSiteUrl ? "eye-tag-green" : "eye-tag-amber"}`}>{project.gscSiteUrl ? "Mapped" : "Not mapped"}</span></h2>
          <div className="eye-section">
            <div className="eye-row"><span>Search Console site</span><strong>{project.gscSiteUrl ?? "—"}</strong></div>
            <div className="eye-row"><span>Query rows</span><strong className="eye-mono">{formatNumber(seo.queryRows)}</strong></div>
            <div className="eye-row"><span>Page rows</span><strong className="eye-mono">{formatNumber(seo.pageRows)}</strong></div>
          </div>
          <p className="eye-panel-text">
            Position is impression-weighted across queries. Search Console reports up to 50,000 rows per request, so very large sites show their top rows.
          </p>
        </article>
        <article className="eye-panel eye-next">
          <h2>Next actions</h2>
          <div className="eye-section">
            {[
              seo.queryRows === 0 ? "Run a sync from Settings for this range." : "Review high-impression queries with low CTR for title/meta improvements.",
              "Compare top pages with Behavior landing pages to spot traffic that doesn't engage.",
              "Re-check after the next sync to confirm the pattern holds.",
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
