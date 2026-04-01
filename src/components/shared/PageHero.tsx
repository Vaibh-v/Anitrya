import { ProjectBadge } from "@/lib/intelligence/ui";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  projectLabel: string;
  projectSubtext: string;
};

export function PageHero({
  eyebrow,
  title,
  body,
  projectLabel,
  projectSubtext,
}: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-300/80">
          {eyebrow}
        </p>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
            {body}
          </p>
        </div>
      </div>

      <ProjectBadge label={projectLabel} subtext={projectSubtext} />
    </div>
  );
}