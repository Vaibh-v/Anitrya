import Link from "next/link";

export type ProjectContextCard = {
  label: string;
  ga4Label?: string | null;
  gscLabel?: string | null;
  href?: string;
  selected?: boolean;
};

type Props = {
  activeProjectLabel: string;
  activeProjectId: string | null;
  cards: ProjectContextCard[];
  createHref?: string;
};

export function ProjectContextSection({
  activeProjectLabel,
  activeProjectId,
  cards,
  createHref = "/home/settings",
}: Props) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,42,92,0.7),rgba(2,10,28,0.95))] p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="text-sm font-medium text-white/60">Project context</div>
          <div className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-white md:text-[44px]">
            {activeProjectLabel}
          </div>
          <div className="mt-4 max-w-3xl text-base leading-7 text-white/68 md:text-[22px] md:leading-8">
            Intelligence is strongest when a single business context is selected. Each project should map to one GA4 property and one GSC site.
          </div>
          {activeProjectId ? (
            <div className="mt-4 text-sm text-cyan-200/85">
              Active project id: {activeProjectId}
            </div>
          ) : null}
        </div>

        <div className="shrink-0">
          <Link
            href={createHref}
            className="inline-flex items-center rounded-[18px] border border-white/10 bg-white/[0.05] px-6 py-4 text-base font-medium text-white transition hover:bg-white/[0.08]"
          >
            Create Project
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const body = (
            <div
              className={`rounded-[24px] border p-6 transition ${
                card.selected
                  ? "border-cyan-300/25 bg-cyan-400/[0.06]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-[20px] font-semibold tracking-[-0.02em] text-white md:text-[30px]">
                  {card.label}
                </div>
                {card.selected ? (
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
                    Selected
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-2 text-sm leading-6 text-white/62 md:text-[19px] md:leading-7">
                <div>GA4: {card.ga4Label ?? "Not mapped"}</div>
                <div>GSC: {card.gscLabel ?? "Not mapped"}</div>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={card.label}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}