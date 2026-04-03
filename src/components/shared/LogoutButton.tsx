"use client";

import { signOut } from "next-auth/react";

type Props = {
  label?: string;
};

export function LogoutButton({ label = "Logout" }: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
    >
      {label}
    </button>
  );
}