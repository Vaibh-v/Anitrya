"use client";

import { signIn } from "next-auth/react";

export function SignInButton(props: { callbackUrl?: string; label?: string }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: props.callbackUrl ?? "/home" })}
      className="eye-primary"
    >
      {props.label ?? "Continue with Google"}
    </button>
  );
}
