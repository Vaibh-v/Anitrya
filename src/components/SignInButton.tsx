"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/home" })}
      className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
    >
      Continue with Google
    </button>
  );
}