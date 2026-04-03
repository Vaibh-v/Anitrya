import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  projectLabel?: string;
  projectSubtext?: string;
  children?: ReactNode;
};

export function PageSectionShell({
  eyebrow,
  title,
  body,
  projectLabel,
  projectSubtext,
  children,
}: Props) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,19,52,0.9),rgba(3,9,25,0.95))] p-6 md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.04em] text-white md:text-[56px]">
            {title}
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-white/68 md:text-[22px] md:leading-8">
            {body}
          </p>
        </div>

        {projectLabel ? (
          <div className="rounded-[20px] border border-cyan-300/15 bg-cyan-400/[0.06] px-5 py-4 xl:min-w-[220px]">
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
              Active project
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {projectLabel}
            </div>
            {projectSubtext ? (
              <div className="mt-2 text-sm text-white/50">{projectSubtext}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}