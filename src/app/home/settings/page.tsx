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
import { StoragePanel } from "@/components/settings/StoragePanel";
import { TeamPanel } from "@/components/settings/TeamPanel";
import { can, getAccess } from "@/lib/org/access";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";

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

function StepHead(props: { index: string; title: string; text: string }) {
  return (
    <div className="eye-step-head">
      <span>{props.index}</span>
      <h2>{props.title}</h2>
      <p>{props.text}</p>
    </div>
  );
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

  const access = await getAccess();
  const scopedSlug =
    access?.projectScope && !(activeProjectSlug && access.projectScope.includes(activeProjectSlug))
      ? access.projectScope[0] ?? null
      : activeProjectSlug;
  const selectedProject =
    access?.projectScope && access.projectScope.length === 0
      ? null
      : await resolveSelectedProject({
          workspaceId,
          projectSlug: scopedSlug,
        });

  const allProjects = workspaceId ? await listWorkspaceProjects(workspaceId) : [];
  // Members limited to certain projects only see and select those.
  const projects = access?.projectScope ? allProjects.filter((p) => access.projectScope!.includes(p.slug)) : allProjects;
  const canSources = can(access, "manage_sources");
  const canSync = can(access, "sync");
  const canExport = can(access, "export");
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

  const isFounder = Boolean(workspaceId && workspaceId === (await resolveFounderWorkspaceId()));

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

      <nav className="eye-settings-nav" aria-label="Settings sections">
        <a href="#projects"><span>01</span>Projects</a>
        <a href="#sources"><span>02</span>Sources</a>
        <a href="#sync"><span>03</span>Sync</a>
        <a href="#export"><span>04</span>Export</a>
        <a href="#health"><span>05</span>Health</a>
        <a href="#team"><span>06</span>Team</a>
      </nav>

      <section id="projects" className="eye-step">
        <ProjectDirectory projects={projects} selectedSlug={selectedProject?.slug ?? null} preset={preset} canCreate={can(access, "manage_projects")} />
      </section>

      {selectedProject ? (
        <div className="eye-legacy">
          {canSources ? (
          <section id="sources" className="eye-step">
            <StepHead index="02" title="Sources" text={`Choose which Google properties feed ${selectedProject.name}.`} />
            <ProjectMappingPanel
              key={`${selectedProject.slug}-map`}
              projectSlug={selectedProject.slug}
              projectLabel={selectedProject.name}
              currentGa4PropertyId={selectedProject.ga4PropertyId}
              currentGscSiteId={selectedProject.gscSiteId}
            />
            <GbpLocationMappingPanel
              key={`${selectedProject.slug}-gbp`}
              projectSlug={selectedProject.slug}
              projectLabel={selectedProject.name}
            />
            <GoogleAdsAccountMappingPanel
              key={`${selectedProject.slug}-ads`}
              projectSlug={selectedProject.slug}
              projectLabel={selectedProject.name}
            />
          </section>
          ) : null}

          <section id="sync" className="eye-step">
            <StepHead index="03" title="Sync" text="Pull fresh evidence for the selected range, then review the run history." />
            {canSync ? (
              <EntitySyncPanel
                key={`${selectedProject.slug}-sync`}
                projectSlug={selectedProject.slug}
                projectLabel={selectedProject.name}
                initialFrom={from}
                initialTo={to}
              />
            ) : null}
            <SyncHealthHistoryPanel runs={syncHealthRuns} />
          </section>

          {canExport ? (
          <section id="export" className="eye-step">
            <StepHead index="04" title="Export" text="Write this project's evidence and intelligence into a Google Sheet." />
            <CustomerSheetExportButton
              projectId={selectedProject.slug}
              projectLabel={selectedProject.name}
              from={from}
              to={to}
            />
          </section>
          ) : null}

          <section id="health" className="eye-step">
            <StepHead index="05" title="Health" text="Connection, mapping and sync readiness for every provider." />
            {isFounder ? <StoragePanel /> : null}
            {integrationHealth ? <IntegrationReadinessPanel health={integrationHealth} /> : null}
          </section>
        </div>
      ) : null}

      <section id="team" className="eye-step">
        <StepHead index="06" title="Team" text="Who can see and change this organization, and what each role may do." />
        <TeamPanel projects={allProjects.map((p) => ({ slug: p.slug, name: p.name }))} />
      </section>

      {selectedProject ? null : (
        <section className="eye-alert">
          <strong>No project yet</strong>
          <span>Create a project above, or set one up from the properties available in your Google account.</span>
        </section>
      )}
    </main>
  );
}
