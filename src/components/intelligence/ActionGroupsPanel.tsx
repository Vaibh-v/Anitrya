"use client";

type ActionGroup = {
  title: string;
  impact: "low" | "medium" | "high";
  steps: string[];
};

export function ActionGroupsPanel({
  actions,
}: {
  actions: ActionGroup[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">
        Recommended action groups
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action, index) => (
          <div
            key={`${action.title}-${index}`}
            className="rounded-xl border border-white/10 bg-black/16 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-white">
                {action.title}
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                {action.impact}
              </div>
            </div>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/60">
              {action.steps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}