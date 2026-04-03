import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import { buildFutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import { ProjectContextSection } from "@/components/shared/ProjectContextSection";
import { SharedPageHeader } from "@/components/shared/SharedPageHeader";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { SettingsHealthPanel } from "@/components/shared/SettingsHealthPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { SectionActionChecklist } from "@/components/shared/SectionActionChecklist";
import { SettingsNavigationPanel } from "@/components/shared/SettingsNavigationPanel";
import { IntegrationTogglePanel } from "@/components/settings/IntegrationTogglePanel";
import { IntegrationCatalogPanel } from "@/components/settings/IntegrationCatalogPanel";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportPanel } from "@/components/settings/CustomerSheetExportPanel";
import { SyncStatusPanel } from "@/components/settings/SyncStatusPanel";
import { ExpansionReadinessSection } from "@/components/settings/ExpansionReadinessSection";
import { RecentSyncRunsTable } from "@/components/settings/RecentSyncRunsTable";
import { SettingsSystemRulesPanel } from "@/components/settings/SettingsSystemRulesPanel";
import { buildIntegrationToggleSeed } from "@/lib/settings/integration-toggle-seed";
import { getSyncStatusSummary } from "@/lib/sync/sync-status-store";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildOverviewHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";

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

  const projectLabel = selectedProject.displayName;
  const projectId = selectedProject.projectId;
  const hasProject = selectedProject.hasProject;
  const workspaceId = session.user?.workspaceId ?? params.workspace ?? null;

  const syncRuns =
    workspaceId
      ? await prisma.syncRun.findMany({
          where: { workspaceId },
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

  const integrationToggles = await buildIntegrationToggleSeed({
    workspaceId,
  });

  const settingsHealthStats = [
    {
      label: "Connected now",
      value: integrationToggles.filter((item) => item.enabled).length,
      context: "Providers currently enabled in the control plane.",
    },
    {
      label: "Preserved next",
      value: integrationToggles.filter((item) => item.state === "preserved").length,
      context: "Providers still visible in architecture but not yet activated.",
    },
    {
      label: "Recent sync runs",
      value: syncRuns.length,
      context: "Execution records currently visible for this workspace.",
    },
    {
      label: "Customer export",
      value: hasProject ? "ready" : "blocked",
      context: hasProject
        ? "Customer sheet export remains available for the selected project."
        : "Resolve a valid project context before export.",
    },
  ];

  const navContext = {
    projectId: hasProject ? projectId : "default-project",
    workspaceId,
    preset: params.preset,
    from: params.from,
    to: params.to,
  };

  return (
    <main className="space-y-8">
      <SharedPageHeader
        projectLabel={projectLabel}
        projectId={hasProject ? projectId : null}
      />

      <ProjectContextSection
        activeProjectLabel={projectLabel}
        activeProjectId={hasProject ? projectId : null}
        cards={[
          {
            label: "Clara AI",
            ga4Label: "Clara Ai",
            gscLabel: "sc-domain:justclara.ai",
            href: "/home/settings?project=clara-ai",
            selected: projectLabel === "Clara AI",
          },
          {
            label: "ZT",
            ga4Label: "ZenTrades",
            gscLabel: "sc-domain:zentrades.pro",
            href: "/home/settings?project=zt",
            selected: projectId === "zt",
          },
        ]}
      />

      <DateRangeToolbar
        basePath="/home/settings"
        projectSlug={hasProject ? projectId : null}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <ProjectMappingHealthPanel
        description="Settings accuracy depends on the active project, workspace, and date window remaining consistent while you reconnect sources and run sync."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: hasProject ? "ready" : "missing",
            context: "Current business context selected for settings and sync control.",
          },
          {
            label: "Project id",
            value: hasProject ? projectId : "unresolved",
            tone: hasProject ? "ready" : "missing",
            context: "The project slug currently passed through the settings layer.",
          },
          {
            label: "Workspace",
            value: workspaceId || "missing",
            tone: workspaceId ? "ready" : "missing",
            context: "Workspace identity used to preserve project context across all tabs.",
          },
          {
            label: "Date range",
            value: `${dateRange.from} → ${dateRange.to}`,
            tone: "ready",
            context: "The current evidence window that downstream sections will use after sync.",
          },
        ]}
      />

      <SettingsHealthPanel
        title="Settings health"
        description="A shared view of the system-level control surface that now governs mappings, sync confidence, export visibility, and source readiness."
        stats={settingsHealthStats}
      />

      <IntegrationTogglePanel initialRecords={integrationToggles} />

      <IntegrationCatalogPanel />

      <EntitySyncPanel
        projectId={projectId}
        projectLabel={projectLabel}
        hasProject={hasProject}
        dateRange={{
          from: dateRange.from,
          to: dateRange.to,
          preset: dateRange.preset,
        }}
      />

      <CustomerSheetExportPanel
        projectId={projectId}
        projectLabel={projectLabel}
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
        projectLabel={projectLabel}
        hasProject={hasProject}
      />

      <RecentSyncRunsTable runs={syncRuns} />

      <ExpansionReadinessSection
        futureReadiness={futureReadiness}
        projectName={projectLabel}
      />

      <ProjectSyncReadinessBanner
        summary="The control plane is visible again, but export still depends on valid Google Sheets scope and evidence hydration still depends on provider-specific normalized runners."
        statuses={[
          {
            label: hasProject ? "Project resolved" : "Project missing",
            tone: hasProject ? "ready" : "missing",
          },
          {
            label: workspaceId ? "Workspace active" : "Workspace missing",
            tone: workspaceId ? "ready" : "missing",
          },
          {
            label: syncRuns.length > 0 ? "Sync history visible" : "No sync history",
            tone: syncRuns.length > 0 ? "partial" : "missing",
          },
          {
            label: "Export auth pending",
            tone: "partial",
          },
        ]}
      />

      <SectionActionChecklist
        title="Settings next actions"
        description="The fastest route to stronger product-wide interpretation is controlled activation, reliable sync logging, valid Google export auth, and real normalized ingestion."
        actions={[
          "Reconnect Google with spreadsheet scope so customer export can write to Sheets.",
          "Keep GA4 and GSC enabled as the first live evidence sources.",
          "Do not force preserved providers into fake sync until their ingestion paths exist.",
          "Use the shared project context section across all tabs to keep project selection consistent.",
        ]}
      />

      <SettingsSystemRulesPanel />

      <SettingsNavigationPanel
        title="Navigate with preserved context"
        description="Move from Settings into the evidence and intelligence surfaces while keeping project and date context intact."
        items={[
          {
            label: "Open overview",
            href: buildOverviewHref(navContext),
            description:
              "Review project-wide evidence concentration after mapping and sync decisions.",
          },
          {
            label: "Open SEO",
            href: buildSeoHref(navContext),
            description:
              "Inspect whether search-demand and page evidence begin hydrating after sync.",
          },
          {
            label: "Open behavior",
            href: buildBehaviorHref(navContext),
            description:
              "Inspect whether landing and acquisition-quality evidence begin hydrating after sync.",
          },
          {
            label: "Open intelligence",
            href: buildIntelligenceHref(navContext),
            description:
              "Review command center, ranking, outcomes, and execution learning after sync.",
          },
        ]}
      />
    </main>
  );
}