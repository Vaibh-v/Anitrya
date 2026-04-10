import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getOverviewEvidenceSummary } from "@/lib/evidence/normalized-overview-store";

type PageProps = {
  searchParams?: Promise<{
    project?: string;
    from?: string;
    to?: string;
  }>;
};

function shiftDate(base: Date, offsetDays: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + offsetDays);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextActionList(summary: Awaited<ReturnType<typeof getOverviewEvidenceSummary>>) {
  const actions: string[] = [];

  if (summary.failureReason) {
    actions.push("Restore database connectivity so project mapping and normalized evidence can be read again.");
    actions.push("Verify DATABASE_URL in the running environment points to the intended Neon instance.");
    actions.push("Confirm the Neon branch / pooler is awake and reachable from the current Codespace or deployment environment.");
    return actions;
  }

  if (summary.ga4SourceRows === 0) actions.push("Hydrate GA4 source / medium rows into overview evidence.");
  if (summary.ga4LandingRows === 0) actions.push("Hydrate GA4 landing page rows into overview evidence.");
  if (summary.gscQueryRows === 0) actions.push("Hydrate GSC query rows into overview evidence.");
  if (summary.gscPageRows === 0) actions.push("Hydrate GSC page rows into overview evidence.");

  if (actions.length === 0) {
    actions.push("Review cross-source concentration and start ranking stronger overview hypotheses.");
  }

  return actions;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Project mapping could not be loaded.";
}

export default async function HomePage(props: PageProps) {
  const session = await requireSession();
  const workspaceId = session.user?.workspaceId;

  if (!workspaceId) {
    throw new Error("Missing workspace context on the current session.");
  }

  const searchParams = (await props.searchParams) ?? {};
  const today = new Date();
  const defaultFrom = formatDate(shiftDate(today, -29));
  const defaultTo = formatDate(today);

  const projectRef = searchParams.project ?? "zt";
  const from = searchParams.from ?? defaultFrom;
  const to = searchParams.to ?? defaultTo;

  let projectError: string | null = null;
  let project = null as Awaited<ReturnType<typeof getProjectMapping>> | null;

  try {
    project = await getProjectMapping({
      ref: projectRef,
      workspaceId,
    });
  } catch (error) {
    projectError = getErrorMessage(error);
  }

  const summary = project
    ? await getOverviewEvidenceSummary({
        workspaceId,
        projectId: project.projectSlug,
        from,
        to,
      })
    : {
        ga4SourceRows: 0,
        ga4LandingRows: 0,
        gscQueryRows: 0,
        gscPageRows: 0,
        failureReason: null,
      };

  const totalRows =
    summary.ga4SourceRows +
    summary.ga4LandingRows +
    summary.gscQueryRows +
    summary.gscPageRows;

  const evidenceStatus = projectError
    ? "Project mapping unavailable"
    : summary.failureReason
      ? "Evidence store unavailable"
      : totalRows === 0
        ? "No diagnostics available"
        : "Evidence available for overview interpretation";

  const actions = nextActionList(summary);

  return (
    <main className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,32,75,0.62),rgba(4,10,24,0.88))] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[12px] uppercase tracking-[0.32em] text-cyan-200/80">Anitrya intelligence</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Project overview</h1>
            <p className="mt-4 max-w-[900px] text-[18px] leading-8 text-white/76">
              Evidence-backed overview across traffic, search visibility, behavior quality, and future expansion readiness.
            </p>
          </div>

          <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 px-6 py-5 text-right">
            <div className="text-[12px] uppercase tracking-[0.32em] text-cyan-100/70">Active project</div>
            <div className="mt-3 text-[34px] font-semibold text-white">{project?.projectLabel ?? "Unavailable"}</div>
            <div className="mt-1 text-sm text-white/55">
              {project ? `ACTIVE PROJECT • ${project.projectSlug}` : "PROJECT MAPPING NOT AVAILABLE"}
            </div>
          </div>
        </div>
      </section>

      {projectError ? (
        <section className="rounded-[28px] border border-amber-300/20 bg-amber-400/10 p-7">
          <div className="text-[12px] uppercase tracking-[0.3em] text-amber-100/75">Backend status</div>
          <h2 className="mt-3 text-[32px] font-semibold text-white">Database connection required</h2>
          <p className="mt-4 max-w-[980px] text-[16px] leading-8 text-white/78">{projectError}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "Check that DATABASE_URL is present in the running environment and matches the intended Neon branch / pooler.",
              "Verify the Neon database is awake and reachable from the current Codespace or deployment network.",
              "After connectivity is restored, reload /home to confirm project mapping and evidence counts are populated again.",
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-white/10 bg-black/20 p-5 text-[15px] leading-7 text-white/72">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "GA4 source rows", value: summary.ga4SourceRows, helper: "Traffic-source evidence available in the current range" },
          { label: "GA4 landing rows", value: summary.ga4LandingRows, helper: "Landing-page quality evidence currently available" },
          { label: "GSC query rows", value: summary.gscQueryRows, helper: "Search-demand rows captured for the selected range" },
          { label: "GSC page rows", value: summary.gscPageRows, helper: "Search page-evidence rows available for diagnostics" },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-white/10 bg-black/14 p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">{item.label}</div>
            <div className="mt-5 text-[56px] font-semibold leading-none text-white">{item.value}</div>
            <p className="mt-5 text-[16px] leading-7 text-white/68">{item.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-[28px] border border-white/10 bg-black/14 p-7">
          <h2 className="text-[34px] font-semibold text-white">Overview evidence concentration</h2>
          <p className="mt-2 text-[15px] text-white/68">
            High-level evidence coverage across the currently connected sources.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Search demand", value: summary.gscQueryRows, helper: "Query-level GSC evidence available for ranked search interpretation." },
              { label: "Search pages", value: summary.gscPageRows, helper: "Page-level GSC evidence available for visibility and landing alignment review." },
              { label: "Landing quality", value: summary.ga4LandingRows, helper: "GA4 landing rows available for page-level quality interpretation." },
              { label: "Acquisition mix", value: summary.ga4SourceRows, helper: "GA4 source / medium rows available for traffic-quality interpretation." },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">{item.label}</div>
                <div className="mt-3 text-[44px] font-semibold leading-none text-white">{item.value}</div>
                <div className="mt-4 text-[15px] leading-7 text-white/64">{item.helper}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/14 p-7">
          <h2 className="text-[34px] font-semibold text-white">Overview interpretation</h2>
          <p className="mt-2 text-[15px] text-white/68">
            Evidence-backed read of the current project condition.
          </p>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[22px] font-semibold text-white">{evidenceStatus}</div>
            <div className="mt-4 text-[16px] leading-8 text-white/68">
              {projectError
                ? "Project mapping could not be loaded because the backing database is unavailable."
                : summary.failureReason
                  ? summary.failureReason
                  : totalRows === 0
                    ? "Evidence is still limited for this section. Run sync and review connected sources."
                    : `The current range contains ${totalRows} normalized evidence rows across GA4 and Search Console.`}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-black/14 p-7">
        <h2 className="text-[34px] font-semibold text-white">Overview next actions</h2>
        <p className="mt-2 text-[15px] text-white/68">
          The product should always end with what the team should do next.
        </p>

        <div className="mt-6 space-y-3">
          {actions.map((action, index) => (
            <div
              key={action}
              className="rounded-[20px] border border-white/10 bg-white/[0.02] px-5 py-4 text-[16px] text-white/78"
            >
              {index + 1}. {action}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}