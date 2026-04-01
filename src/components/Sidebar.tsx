"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const items = [
  { href: "/home", label: "Overview" },
  { href: "/home/seo", label: "SEO" },
  { href: "/home/behavior", label: "Behavior" },
  { href: "/home/settings", label: "Settings" },
  { href: "/home/intelligence", label: "Intelligence" }
];

function withProject(href: string, project: string | null) {
  if (!project) return href;
  return `${href}?project=${encodeURIComponent(project)}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const project = searchParams.get("project");

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-brand">
        <Link href={withProject("/home", project)} className="sidebar-logo-link">
          <div className="sidebar-logo">Anitrya</div>
          <div className="sidebar-subtitle">Analytics Intelligence</div>
        </Link>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={withProject(item.href, project)}
              className={active ? "sidebar-link sidebar-link-active" : "sidebar-link"}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-orb">N</div>
      </div>
    </aside>
  );
}