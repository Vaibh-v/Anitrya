import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { buildFutureReadinessPanelData } from "@/lib/intelligence/future-readiness";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildOverviewHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";
import { getSyncStatusSummary } from "@/lib/sync/sync-status-store";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportPanel } from "@/components/settings/CustomerSheetExportPanel";
import { ExpansionReadinessSection } from "@/components/settings/ExpansionReadinessSection";
import { SyncStatusPanel } from "@/components/settings/SyncStatusPanel";
import { IntegrationCatalogPanel } from "@/components/settings/IntegrationCatalogPanel";
import { SettingsSectionHero } from "@/components/shared/SettingsSectionHero";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { SettingsHealthPanel } from "@/components/shared/SettingsHealthPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { SectionActionChecklist } from "@/components/shared/SectionActionChecklist";
import { SettingsNavigationPanel } from "@/components/shared/SettingsNavigationPanel";
import { RecentSyncRunsTable } from "../../../components/settings/RecentSyncRunsTable";
import { SettingsSystemRulesPanel } from "../../../components/settings/SettingsSystemRulesPanel";

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

  const settingsHealthStats = [
    {
      label: "Connected now",
      value: hasProject ? 1 : 0,
      context: "Project-scoped operational controls currently resolved in Settings.",
    },
    {
      label: "Preserved next",
      value: 7,
      context: "Future integrations already preserved in architecture.",
    },
    {
      label: "Recent sync runs",
      value: syncRuns.length,
      context: "Operational execution records currently visible in this workspace.",
    },
    {
      label: "Customer export",
      value: hasProject ? "ready" : "blocked",
      context: hasProject
        ? "Customer sheet export surface is available for the selected project."
        : "Resolve a valid project context to enable export safely.",
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
      <DateRangeToolbar
        basePath="/home/settings"
        projectSlug={hasProject ? projectId : null}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <SettingsSectionHero
        title="Settings"
        description="Integration status, sync control, operational visibility, customer-sheet export, and expansion readiness."
        projectLabel={projectLabel}
        projectId={hasProject ? projectId : "unresolved"}
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
        summary="The control plane is visible again, but the product still needs normalized evidence hydration before Overview, SEO, Behavior, and Intelligence can move from thin reads to stronger ranked interpretation."
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
          { label: "Export path pending", tone: "partial" },
        ]}
      />

      <SectionActionChecklist
        title="Settings next actions"
        description="The fastest route to stronger product-wide interpretation is tighter mapping discipline and repeatable sync + export verification."
        actions={[
          "Confirm the selected project maps to the correct GA4 property and GSC site.",
          "Run sync and verify the latest sync ledger reflects real execution.",
          "Use the customer export panel to verify rows are actually written into the target sheet.",
          "Only trust downstream intelligence after evidence becomes visible in Overview, SEO, and Behavior.",
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