import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveSelectedProject, listWorkspaceProjects } from "@/lib/projects/resolve-selected-project";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportButton } from "@/components/settings/CustomerSheetExportButton";
import { ProjectMappingPanel } from "@/components/settings/ProjectMappingPanel";
import { SyncHealthHistoryPanel } from "@/components/settings/SyncHealthHistoryPanel";
import { listSyncHealthRuns } from "@/lib/sync/sync-health-history";
import { IntegrationReadinessPanel } from "@/components/settings/IntegrationReadinessPanel";
import { buildProjectIntegrationHealth } from "@/lib/integrations/project-integration-health";
import { GbpLocationMappingPanel } from "@/components/settings/GbpLocationMappingPanel";
import { GoogleAdsAccountMappingPanel } from "@/components/settings/GoogleAdsAccountMappingPanel";
import { ProjectDirectory } from "@/components/settings/ProjectDirectory";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveDateRange(preset: string) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);

  const start = new Date(today);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "90d") start.setDate(start.getDate() - 89);
  else start.setDate(start.getDate() - 29);

  return {
    from: start.toISOString().slice(0, 10),
    to: end,
  };
}

function buildHref(base: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${base}?${search.toString()}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const resolved = await searchParams;

  const workspaceId = session.user?.workspaceId ?? null;
  const activeProjectSlug = readString(resolved.project) || null;
  const preset = readString(resolved.preset) || "30d";
  const { from, to } = resolveDateRange(preset);

  const selectedProject = await resolveSelectedProject({
    workspaceId,
    projectSlug: activeProjectSlug,
  });

  const projects = workspaceId ? await listWorkspaceProjects(workspaceId) : [];
  const syncHealthRuns =
    workspaceId && selectedProject
      ? await listSyncHealthRuns({
          workspaceId,
          projectSlug: selectedProject.slug,
          take: 5,
        })
      : [];
  const integrationHealth = selectedProject
    ? await buildProjectIntegrationHealth({
        workspaceId,
        projectId: selectedProject.slug,
      })
    : null;

  const rangeLinks = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
  ];

  return (
    <main className="eye-page eye-settings">
      <section className="eye-heading">
        <div>
          <p className="eye-overline">Anitrya / Settings</p>
          <h1>{selectedProject?.name ?? "Set up your first project"}</h1>
          <p>Map sources, sync evidence and export for the selected project.</p>
        </div>
        <div className="eye-heading-project">
          <span>Date range</span>
          <strong className="eye-mono">{from} → {to}</strong>
          <div className="eye-segment eye-segment-inline" role="group" aria-label="Date range">
            {rangeLinks.map((item) => (
              <a
                key={item.key}
                aria-pressed={preset === item.key}
                href={buildHref("/home/settings", { project: selectedProject?.slug ?? null, preset: item.key })}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <ProjectDirectory projects={projects} selectedSlug={selectedProject?.slug ?? null} preset={preset} />

      <div className="eye-legacy">
      {selectedProject ? (
        <>
          <ProjectMappingPanel
            key={selectedProject.slug}
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
            currentGa4PropertyId={selectedProject.ga4PropertyId}
            currentGscSiteId={selectedProject.gscSiteId}
          />

          <GbpLocationMappingPanel
            key={selectedProject.slug}
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
          />

          <GoogleAdsAccountMappingPanel
            key={selectedProject.slug}
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
          />

          {integrationHealth ? (
            <IntegrationReadinessPanel health={integrationHealth} />
          ) : null}

          <EntitySyncPanel
            key={selectedProject.slug}
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
            initialFrom={from}
            initialTo={to}
          />

          <SyncHealthHistoryPanel runs={syncHealthRuns} />

          <CustomerSheetExportButton
            projectId={selectedProject.slug}
            projectLabel={selectedProject.name}
            from={from}
            to={to}
          />
        </>
      ) : (
        <section className="eye-alert">
          <strong>No project yet</strong>
          <span>Create a project above, or set one up from the properties available in your Google account.</span>
        </section>
      )}
      </div>
    </main>
  );
}
