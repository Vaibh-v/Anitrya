import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { buildFutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import { DateRangeToolbar, SectionCard } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { PageHero } from "@/components/shared/PageHero";
import { KpiStrip } from "@/components/shared/KpiStrip";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportPanel } from "@/components/settings/CustomerSheetExportPanel";
import { ExpansionReadinessSection } from "@/components/settings/ExpansionReadinessSection";
import { getSyncStatusSummary } from "@/lib/sync/sync-status-store";
import { SyncStatusPanel } from "@/components/settings/SyncStatusPanel";
import { getProviderStateRecords } from "@/lib/integrations/provider-state-store";
import { buildProviderStateSummaryCards } from "@/lib/integrations/provider-state-summary";
import { ProviderStatePanel } from "@/components/settings/ProviderStatePanel";

type PageProps = {
  searchParams?: Promise<{
    project?: string;
    workspace?: string;
    preset?: string;
    from?: string;
    to?: string;
    projectName?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireSession();

  const selectedProject = resolveSelectedProject({
    requestedProjectId: params.project ?? null,
    requestedProjectName: params.projectName ?? null,
    sessionWorkspaceId: session.user?.workspaceId ?? params.workspace ?? null,
    fallbackProjectId: "default-project",
  });

  const dateRange = resolveDateRange({
    preset: params.preset,
    from: params.from,
    to: params.to,
  });

  const futureReadiness = buildFutureReadinessPanelData();

  const projectName = selectedProject.displayName;
  const projectId = selectedProject.projectId;
  const hasProject = selectedProject.hasProject;
  const workspaceId = session.user?.workspaceId ?? params.workspace ?? null;

  const syncRuns =
    workspaceId && hasProject
      ? await prisma.syncRun.findMany({
          where: {
            workspaceId,
          },
          orderBy: { startedAt: "desc" },
          take: 16,
        })
      : [];

  const syncStatus =
    workspaceId && hasProject
      ? await getSyncStatusSummary({
          workspaceId,
          projectSlug: projectId,
        })
      : {
          currentState: "idle" as const,
          latestRun: null,
          recentRuns: [],
        };

  const providerRecords =
    workspaceId && hasProject
      ? await getProviderStateRecords({
          workspaceId,
          projectSlug: projectId,
        })
      : [];

  const providerSummaryCards = buildProviderStateSummaryCards(providerRecords);

  const connectedCount = providerSummaryCards.reduce(
    (sum, card) => sum + (card.value > 0 ? 1 : 0),
    0
  );

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home/settings"
        projectSlug={hasProject ? projectId : null}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <PageHero
        eyebrow="System state"
        title="Settings"
        body="Integration status, sync control, operational visibility, customer-sheet export, and expansion readiness."
        projectLabel={projectName}
        projectSubtext={
          hasProject ? `Project: ${projectId}` : "No project selected"
        }
      />

      <KpiStrip
        items={[
          {
            label: "Connected now",
            value: connectedCount,
            context: "Live evidence layers currently mapped to this project",
          },
          {
            label: "Preserved next",
            value: 3,
            context: "GBP, Google Ads, and Google Trends surfaces already prepared",
          },
          {
            label: "Recent sync runs",
            value: syncRuns.length,
            context: "Operational execution records currently visible",
          },
          {
            label: "Customer export",
            value: hasProject ? "ready" : "blocked",
            context: hasProject
              ? "Customer sheet export surface is ready for this project"
              : "Resolve a valid project context to enable export",
          },
        ]}
      />

      <EntitySyncPanel
        projectId={projectId}
        projectLabel={projectName}
        hasProject={hasProject}
        dateRange={{
          from: dateRange.from,
          to: dateRange.to,
          preset: dateRange.preset,
        }}
      />

      <CustomerSheetExportPanel
        projectId={projectId}
        projectLabel={projectName}
        hasProject={hasProject}
        dateRange={{
          from: dateRange.from,
          to: dateRange.to,
          preset: dateRange.preset,
        }}
      />

      <SyncStatusPanel
        summary={syncStatus}
        projectId={projectId}
        projectLabel={projectName}
        hasProject={hasProject}
      />

      <ProviderStatePanel
        projectName={projectName}
        records={providerRecords}
        summaryCards={providerSummaryCards}
      />

      <ExpansionReadinessSection
        futureReadiness={futureReadiness}
        projectName={projectName}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Connected evidence sources"
          subtitle="Currently mapped sources feeding the intelligence spine."
        >
          <div className="space-y-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Project-scoped evidence layer
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    All operational controls on this page now resolve against the same
                    project identity before sync, export, and provider-state rendering.
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-xs text-emerald-100">
                  {hasProject ? "Resolved" : "Missing"}
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-black/16 px-3 py-3 text-sm text-white/72">
                {hasProject
                  ? `${projectName} • ${projectId}`
                  : "No project context is currently resolved"}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Workspace control plane
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/60">
                    Provider-state, sync ledger, and export routes continue to operate
                    inside the authenticated workspace context.
                  </div>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                  {workspaceId ? "Active" : "Unavailable"}
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-black/16 px-3 py-3 text-sm text-white/72">
                {workspaceId ?? "No workspace available on the current session"}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Operational standard"
          subtitle="Non-negotiable behavior for the intelligence system."
        >
          <div className="grid gap-4">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
              Failures must remain visible and explainable.
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
              Intelligence must remain evidence-backed.
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
              Future integrations must plug into the same normalized reasoning layer.
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent sync runs"
        subtitle="Most recent operational executions across connected sources."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-white/38">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Ended</th>
              </tr>
            </thead>
            <tbody>
              {syncRuns.map((run) => (
                <tr
                  key={run.id}
                  className="rounded-2xl bg-white/[0.03] text-sm text-white/72"
                >
                  <td className="rounded-l-2xl px-3 py-3">{run.source}</td>
                  <td className="px-3 py-3">{run.status}</td>
                  <td className="px-3 py-3">{run.rowsSynced}</td>
                  <td className="px-3 py-3">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                  <td className="rounded-r-2xl px-3 py-3">
                    {run.endedAt ? new Date(run.endedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}