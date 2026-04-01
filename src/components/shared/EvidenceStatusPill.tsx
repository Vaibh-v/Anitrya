"use client";

type Props = {
  label: string;
  tone: "ready" | "partial" | "missing" | "neutral";
};

export function EvidenceStatusPill({ label, tone }: Props) {
  const toneClasses =
    tone === "ready"
      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
      : tone === "partial"
      ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100"
      : tone === "missing"
      ? "border-amber-400/20 bg-amber-400/[0.08] text-amber-100"
      : "border-white/10 bg-white/[0.03] text-white/60";

  return (
    <div className={`rounded-full border px-2.5 py-1 text-xs ${toneClasses}`}>
      {label}
    </div>
  );
}