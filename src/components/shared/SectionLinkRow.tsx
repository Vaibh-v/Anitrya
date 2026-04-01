import Link from "next/link";

type LinkItem = {
  label: string;
  href: string;
};

type Props = {
  title: string;
  subtitle: string;
  links: LinkItem[];
};

export function SectionLinkRow({ title, subtitle, links }: Props) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/56">{subtitle}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[18px] border border-white/10 bg-black/16 px-4 py-4 text-sm text-white/72 transition hover:bg-white/[0.06]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}