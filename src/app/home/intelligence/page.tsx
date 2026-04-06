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

export default async function IntelligencePage(props: PageProps) {
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

  const summary = await getOverviewEvidenceSummary({
    workspaceId,
    projectId: project.projectSlug,
    from,
    to,
  });

  const totalEvidence =
    summary.ga4SourceRows +
    summary.ga4LandingRows +
    summary.gscQueryRows +
    summary.gscPageRows;

  const missingSources = [
    summary.ga4SourceRows === 0 ? "GA4 source evidence" : null,
    summary.ga4LandingRows === 0 ? "GA4 landing evidence" : null,
    summary.gscQueryRows === 0 ? "GSC query evidence" : null,
    summary.gscPageRows === 0 ? "GSC page evidence" : null,
  ].filter(Boolean) as string[];

  return (
    <main className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,32,75,0.62),rgba(4,10,24,0.88))] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[12px] uppercase tracking-[0.32em] text-cyan-200/80">Anitrya intelligence</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Intelligence read</h1>
            <p className="mt-4 max-w-[950px] text-[18px] leading-8 text-white/76">
              Cross-source reasoning built from normalized project evidence, structured diagnostics, missing-data awareness, persistent memory, and ranked next actions.
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
          { label: "Evidence points", value: totalEvidence, helper: "Structured evidence points currently available to the reasoning layer." },
          { label: "Missing sources", value: missingSources.length, helper: "Evidence layers that still need hydration before confidence can rise." },
          { label: "Next actions", value: Math.max(missingSources.length, 1), helper: "Action groups currently generated from the active project context." },
          { label: "Memory snapshots", value: 1, helper: "Persisted intelligence memory entries currently available." },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-white/10 bg-black/14 p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">{item.label}</div>
            <div className="mt-5 text-[56px] font-semibold leading-none text-white">{item.value}</div>
            <p className="mt-5 text-[16px] leading-7 text-white/68">{item.helper}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-black/14 p-7">
        <h2 className="text-[34px] font-semibold text-white">Primary decision brief</h2>
        <p className="mt-2 text-[15px] text-white/68">
          Confidence is currently constrained by missing evidence coverage, so the first priority is closing the highest-friction data gaps.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr_1fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">Supporting evidence</div>
            <div className="mt-4 text-[18px] leading-8 text-white/78">
              project: {project.projectSlug}
              <br />
              total evidence rows: {totalEvidence}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">Confidence blockers</div>
            <div className="mt-4 space-y-3">
              {missingSources.length === 0 ? (
                <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  No missing source blockers are currently visible.
                </div>
              ) : (
                missingSources.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50"
                  >
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[12px] uppercase tracking-[0.3em] text-white/46">Ordered actions</div>
            <ol className="mt-4 space-y-3 text-[16px] leading-7 text-white/76">
              <li>1. Run sync and verify the active project mapping.</li>
              <li>2. Confirm normalized GA4 and GSC rows are persisting.</li>
              <li>3. Refresh overview, SEO, and behavior after hydration.</li>
              <li>4. Promote stronger ranked hypotheses only after evidence deepens.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-black/14 p-7">
        <h2 className="text-[34px] font-semibold text-white">Recommended next actions</h2>
        <div className="mt-6 space-y-3">
          {[
            missingSources.length > 0
              ? `Complete evidence coverage: ${missingSources.join(", ")}.`
              : "Evidence coverage is sufficient for stronger ranked reads.",
            "Validate project mapping before trusting cross-source conclusions.",
            "Refresh the intelligence tab after normalized evidence is updated.",
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