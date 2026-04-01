"use client";

type Props = {
  title: string;
  description: string;
  unlocks: string[];
};

export function SectionUnlockPanel({ title, description, unlocks }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-4 space-y-2">
        {unlocks.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/65"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}