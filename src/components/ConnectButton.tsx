"use client";

import { signIn } from "next-auth/react";

type Props = {
  provider: "google-gsc" | "google-ga4";
  callbackUrl: string;
  label: string;
};

export function ConnectButton(props: Props) {
  return (
    <button
      onClick={() => signIn(props.provider, { callbackUrl: props.callbackUrl })}
      className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
    >
      {props.label}
    </button>
  );
}