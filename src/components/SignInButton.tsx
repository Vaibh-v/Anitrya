"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/home" })}
      className="eye-primary"
    >
      Continue with Google
    </button>
  );
}
