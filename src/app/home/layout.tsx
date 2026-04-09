import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const navItems = [
  { href: "/home", label: "Overview" },
  { href: "/home/seo", label: "SEO" },
  { href: "/home/behavior", label: "Behavior" },
  { href: "/home/settings", label: "Settings" },
  { href: "/home/intelligence", label: "Intelligence" },
];

export default function HomeLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#020816] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 flex min-h-screen w-[240px] flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(8,18,44,0.98),rgba(4,10,24,0.98))] px-7 py-8">
          <div>
            <div className="text-[32px] font-semibold tracking-[-0.03em] text-white">
              Anitrya
            </div>
            <div className="mt-2 text-[18px] text-white/60">
              Analytics Intelligence
            </div>
          </div>

          <nav className="mt-20 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[20px] px-5 py-4 text-[20px] font-medium text-white/78 transition hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex items-center gap-4 pt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/4 text-[18px] font-semibold text-white/80">
              N
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-8 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}