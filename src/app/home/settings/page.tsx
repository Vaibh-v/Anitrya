import { requireSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { DateRangeToolbar } from "@/lib/intelligence/ui";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";
import {
  buildBehaviorHref,
  buildIntelligenceHref,
  buildOverviewHref,
  buildSeoHref,
} from "@/lib/intelligence/navigation-links";
import {
  buildSettingsActionChecklist,
  buildSettingsHealthStats,
  buildSettingsIntegrationItems,
} from "@/lib/intelligence/integration-health";
import { SettingsSectionHero } from "@/components/shared/SettingsSectionHero";
import { ProjectMappingHealthPanel } from "@/components/shared/ProjectMappingHealthPanel";
import { SettingsHealthPanel } from "@/components/shared/SettingsHealthPanel";
import { IntegrationStatusPanel } from "@/components/shared/IntegrationStatusPanel";
import { ProjectSyncReadinessBanner } from "@/components/shared/ProjectSyncReadinessBanner";
import { SectionActionChecklist } from "@/components/shared/SectionActionChecklist";
import { SettingsNavigationPanel } from "@/components/shared/SettingsNavigationPanel";

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

  const projectId = selectedProject.projectId;
  const projectLabel = selectedProject.displayName;
  const workspaceId = session.user?.workspaceId ?? params.workspace ?? null;

  const navContext = {
    projectId,
    workspaceId,
    preset: params.preset,
    from: params.from,
    to: params.to,
  };

  return (
    <main className="space-y-8">
      <DateRangeToolbar
        basePath="/home/settings"
        projectSlug={projectId}
        workspaceId={workspaceId}
        range={dateRange}
      />

      <SettingsSectionHero
        title="Settings"
        description="Control project mapping, sync readiness, integration health, and the operating conditions that determine whether evidence can hydrate correctly across the product."
        projectLabel={projectLabel}
        projectId={projectId}
      />

      <ProjectMappingHealthPanel
        description="Settings accuracy depends on the active project, workspace, and date window remaining consistent while you reconnect sources and run sync."
        items={[
          {
            label: "Project",
            value: projectLabel || "unresolved",
            tone: projectLabel ? "ready" : "missing",
            context: "Current business context selected for settings and sync control.",
          },
          {
            label: "Project id",
            value: projectId || "unresolved",
            tone: projectId ? "ready" : "missing",
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
        description="A shared view of the system-level control surface that now governs mappings, sync confidence, and source readiness."
        stats={buildSettingsHealthStats()}
      />

      <IntegrationStatusPanel
        title="Integration status"
        description="Current readiness of the integrations and evidence layers that determine whether the product can move from structure to data-backed interpretation."
        items={buildSettingsIntegrationItems()}
      />

      <ProjectSyncReadinessBanner
        summary="The control layer is strong, but the product still needs normalized evidence hydration before Overview, SEO, and Behavior can move from thin interpretation to stronger ranked reads."
        statuses={[
          { label: "Project context ready", tone: "ready" },
          { label: "GA4 partial", tone: "partial" },
          { label: "GSC partial", tone: "partial" },
          { label: "Evidence hydration pending", tone: "missing" },
        ]}
      />

      <SectionActionChecklist
        title="Settings next actions"
        description="The fastest route to stronger product-wide interpretation is tighter mapping discipline and repeatable sync verification."
        actions={buildSettingsActionChecklist()}
      />

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