"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  endpoint: string;
  label: string;
};

export function ActionButton(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch(props.endpoint, { method: "POST" });
          if (!res.ok) {
            const text = await res.text();
            alert(text || "Request failed");
            return;
          }
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
      className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? "Working..." : props.label}
    </button>
  );
}