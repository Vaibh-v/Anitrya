import { OutcomeRecorder } from "@/components/intelligence/OutcomeRecorder";

type FindingLike = {
  title?: string;
  summary?: string;
  confidence?: string;
  nextSteps?: string[];
};

type Props = {
  projectId?: string | null;
  finding: FindingLike;
  fallbackTitle: string;
};

export function FindingRecommendationCard({
  projectId,
  finding,
  fallbackTitle,
}: Props) {
  const title = finding.title?.trim() || fallbackTitle;
  const summary = finding.summary?.trim() || "No summary provided.";
  const confidence = finding.confidence?.trim() || "low";
  const nextSteps =
    Array.isArray(finding.nextSteps) && finding.nextSteps.length > 0
      ? finding.nextSteps
      : ["Review and validate this finding."];

  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="mt-2 text-sm leading-6 text-white/58">{summary}</p>

          <div className="mt-4 space-y-2">
            {nextSteps.map((step, index) => (
              <div
                key={`${step}-${index}`}
                className="rounded-[12px] border border-white/10 bg-black/16 px-3 py-2.5 text-sm text-white/72"
              >
                {step}
              </div>
            ))}
          </div>

          {projectId ? (
            <div className="mt-4">
              <OutcomeRecorder
                projectId={projectId}
                hypothesisTitle={title}
                recommendationTitle={nextSteps[0]}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/56">
          {confidence}
        </div>
      </div>
    </div>
  );
}