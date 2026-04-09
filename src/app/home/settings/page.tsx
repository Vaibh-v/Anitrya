import { requireSession } from "@/lib/auth";
import { resolveSelectedProject, listWorkspaceProjects } from "@/lib/projects/resolve-selected-project";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportButton } from "@/components/settings/CustomerSheetExportButton";
import { ProjectMappingPanel } from "@/components/settings/ProjectMappingPanel";

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
  const session = await requireSession();
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

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,35,81,0.92),rgba(6,18,45,0.94))] px-8 py-8">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[880px]">
            <div className="text-[18px] text-white/65">Project context</div>
            <h1 className="mt-3 text-[46px] font-semibold tracking-[-0.04em] text-white">
              {selectedProject?.name ?? "No project selected"}
            </h1>
            <p className="mt-4 max-w-[900px] text-[21px] leading-10 text-white/72">
              Intelligence is strongest when a single business context is selected.
              Each project should map to one GA4 property and one GSC site.
            </p>
          </div>

          <button className="rounded-[22px] border border-white/12 bg-white/5 px-8 py-5 text-[18px] font-medium text-white/88">
            Create Project
          </button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map((project) => {
            const selected = selectedProject?.slug === project.slug;
            return (
              <a
                key={project.id}
                href={buildHref("/home/settings", {
                  project: project.slug,
                  preset,
                })}
                className={`rounded-[26px] border px-7 py-7 transition ${
                  selected
                    ? "border-cyan-300/22 bg-[linear-gradient(180deg,rgba(20,47,108,0.62),rgba(5,18,47,0.68))]"
                    : "border-white/10 bg-black/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[18px] font-semibold text-white">{project.name}</div>
                  {selected ? (
                    <span className="rounded-full border border-cyan-300/22 bg-cyan-300/10 px-4 py-1 text-[14px] text-cyan-100">
                      Selected
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 space-y-2 text-[16px] text-white/62">
                  <div>GA4: {project.ga4PropertyId ?? "Not mapped"}</div>
                  <div>GSC: {project.gscSiteId ?? "Not mapped"}</div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(90deg,rgba(18,38,88,0.7),rgba(7,17,39,0.88),rgba(14,44,64,0.56))] px-6 py-5">
        <div className="text-[12px] uppercase tracking-[0.28em] text-white/55">
          Date range
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
          <div className="text-[22px] font-medium text-white">
            {from} → {to}
          </div>

          <div className="flex items-center gap-3">
            {[
              { key: "7d", label: "7D" },
              { key: "30d", label: "30D" },
              { key: "90d", label: "90D" },
              { key: "custom", label: "Custom" },
            ].map((item) => (
              <a
                key={item.key}
                href={buildHref("/home/settings", {
                  project: selectedProject?.slug ?? null,
                  preset: item.key,
                })}
                className={`rounded-full border px-4 py-2 text-[14px] ${
                  preset === item.key
                    ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 bg-white/4 text-white/70"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {selectedProject ? (
        <>
          <ProjectMappingPanel
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
            currentGa4PropertyId={selectedProject.ga4PropertyId}
            currentGscSiteId={selectedProject.gscSiteId}
          />

          <EntitySyncPanel
            projectSlug={selectedProject.slug}
            projectLabel={selectedProject.name}
            initialFrom={from}
            initialTo={to}
          />

          <CustomerSheetExportButton
            projectId={selectedProject.slug}
            projectLabel={selectedProject.name}
            from={from}
            to={to}
          />
        </>
      ) : (
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,79,0.88),rgba(5,15,39,0.94))] px-8 py-8 text-[18px] text-white/72">
          No project is available for this workspace yet.
        </section>
      )}
    </div>
  );
}