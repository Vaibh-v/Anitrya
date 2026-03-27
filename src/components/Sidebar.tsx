"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Overview" },
  { href: "/home/seo", label: "SEO" },
  { href: "/home/behavior", label: "Behavior" },
  { href: "/home/settings", label: "Settings" },
  { href: "/home/intelligence", label: "Intelligence" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[250px] shrink-0 border-r border-white/5 px-5 py-6">
      <div className="mb-10">
        <div className="text-[24px] font-semibold tracking-tight text-white">
          Anitrya
        </div>
        <div className="mt-1 text-sm body-muted">Analytics Intelligence</div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/home" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}