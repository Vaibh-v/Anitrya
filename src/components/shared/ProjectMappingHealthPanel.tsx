import { EvidenceStatusPill } from "@/components/shared/EvidenceStatusPill";

type MappingItem = {
  label: string;
  value: string;
  tone: "ready" | "partial" | "missing" | "neutral";
  context: string;
};

type Props = {
  title?: string;
  description: string;
  items: MappingItem[];
};

export function ProjectMappingHealthPanel({
  title = "Project mapping health",
  description,
  items,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-2xl border border-white/10 bg-black/16 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                {item.label}
              </div>
              <EvidenceStatusPill label={item.value} tone={item.tone} />
            </div>

            <div className="mt-3 text-sm leading-6 text-white/60">{item.context}</div>
          </div>
        ))}
      </div>
    </div>
  );
}