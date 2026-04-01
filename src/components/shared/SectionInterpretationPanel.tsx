"use client";

type Props = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function SectionInterpretationPanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
        <div className="text-sm font-semibold text-white">{emptyTitle}</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          {emptyDescription}
        </div>
      </div>
    </div>
  );
}