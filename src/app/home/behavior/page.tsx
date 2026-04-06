import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { getBehaviorEvidenceSummary } from "@/lib/evidence/normalized-behavior-store";

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

export default async function BehaviorPage(props: PageProps) {
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

  const project = await getProjectMapping({
    projectRef,
    workspaceId,
  });

  const summary = await getBehaviorEvidenceSummary({
    workspaceId,
    projectId: project.projectSlug,
    from,
    to,
  });

  const confidence =
    summary.landingRows > 0 && summary.sourceRows > 0
      ? "medium"
      : summary.landingRows > 0 || summary.sourceRows > 0
        ? "low"
        : "low";

  return (
    <main className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,32,75,0.62),rgba(4,10,24,0.88))] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[12px] uppercase tracking-[0.32em] text-cyan-200/80">Anitrya intelligence</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Behavior evidence</h1>
            <p className="mt-4 max-w-[900px] text-[18px] leading-8 text-white/76">
              Landing-page and acquisition-quality interpretation built from normalized GA4 behavior evidence.
            </p>
          </div>

          <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 px-6 py-5 text-right">
            <div className="text-[12px] uppercase tracking-[0.32em] text-cyan-100/70">Active project</div>
            <div className="mt-3 text-[34px] font-semibold text-white">{project.projectLabel}</div>
            <div className="mt-1 text-sm text-white/55">ACTIVE PROJECT • {project.projectSlug}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Landing rows", value: summary.landingRows, helper: "Page-level behavior evidence available in the current range" },
          { label: "Source rows", value: summary.sourceRows, helper: "Acquisition-quality rows available in the current range" },
          { label: "Entity findings", value: summary.landingRows + summary.sourceRows, helper: "Structured behavior findings currently rankable once interpretation deepens" },
          { label: "Confidence", value: confidence, helper: "Current ranked confidence for behavior interpretation" },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-white/10 bg-black/14 p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">{item.label}</div>
            <div className="mt-5 text-[56px] font-semibold leading-none text-white">{item.value}</div>
            <p className="mt-5 text-[16px] leading-7 text-white/68">{item.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[28px] border border-white/10 bg-black/14 p-7">
          <h2 className="text-[34px] font-semibold text-white">Behavior evidence coverage</h2>
          <p className="mt-2 text-[15px] text-white/68">
            Coverage across landing quality and acquisition-quality interpretation.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Landing evidence", value: summary.landingRows, helper: "Page-level engagement and conversion-signal evidence used for behavior diagnosis." },
              { label: "Acquisition evidence", value: summary.sourceRows, helper: "Source / medium evidence used for traffic-quality and conversion-support interpretation." },
              { label: "Best next step", value: "quality / conversion", helper: "Use landing and source concentration to isolate weak intent-to-performance alignment." },
              { label: "Readiness", value: summary.landingRows + summary.sourceRows > 0 ? "partial" : "thin", helper: "Indicates whether behavior evidence is deep enough for stronger ranking." },
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
          <h2 className="text-[34px] font-semibold text-white">Behavior interpretation</h2>
          <p className="mt-2 text-[15px] text-white/68">
            Current behavior contribution to the total intelligence read.
          </p>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[22px] font-semibold text-white">
              {summary.landingRows + summary.sourceRows === 0
                ? "No diagnostics available"
                : "Behavior evidence is available"}
            </div>
            <div className="mt-4 text-[16px] leading-8 text-white/68">
              {summary.landingRows + summary.sourceRows === 0
                ? "Evidence is still limited for this section. Run sync and review connected sources."
                : `The current range contains ${summary.landingRows} landing rows and ${summary.sourceRows} source rows for behavior interpretation.`}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-black/14 p-7">
        <h2 className="text-[34px] font-semibold text-white">Behavior next actions</h2>
        <div className="mt-6 space-y-3">
          {[
            "Confirm the active project still maps to the correct GA4 property.",
            "Run sync after mapping is confirmed so landing and source rows can hydrate.",
            "Validate that landing and acquisition evidence point to the same performance pattern before promotion.",
            "Re-check the intelligence read after GA4 behavior evidence becomes materially available.",
          ].map((action, index) => (
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