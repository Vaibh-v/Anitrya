"use client";

import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
  description: string;
};

type Props = {
  title: string;
  description: string;
  items: NavItem[];
};

export function SettingsNavigationPanel({
  title,
  description,
  items,
}: Props) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="text-2xl font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-black/16 p-4 transition hover:bg-white/[0.05]"
          >
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="mt-2 text-sm leading-6 text-white/55">
              {item.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}