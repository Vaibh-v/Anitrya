type Props = {
  title: string;
  description: string;
  actions: string[];
};

export function SectionActionChecklist({
  title,
  description,
  actions,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 space-y-3">
        {actions.map((action, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/65"
          >
            {index + 1}. {action}
          </div>
        ))}
      </div>
    </div>
  );
}