import { ProjectBadge } from "@/lib/intelligence/ui";

type Props = {
  title: string;
  description: string;
  projectLabel: string;
  projectId: string;
};

export function SettingsSectionHero({
  title,
  description,
  projectLabel,
  projectId,
}: Props) {
  const safeProjectLabel =
    projectLabel && projectLabel.trim().length > 0
      ? projectLabel
      : "No project selected";

  const safeProjectId =
    projectId && projectId.trim().length > 0 ? projectId : "unresolved";

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
            Anitrya Control Layer
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
            {description}
          </p>
        </div>

        <ProjectBadge
          label={safeProjectLabel}
          sublabel={`ACTIVE PROJECT • ${safeProjectId}`}
        />
      </div>
    </section>
  );
}