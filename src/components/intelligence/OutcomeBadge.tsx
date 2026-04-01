"use client";

export function OutcomeBadge({
  outcome,
}: {
  outcome: "accepted" | "rejected" | "implemented" | "improved" | "no_impact";
}) {
  const styles = {
    accepted: "bg-white/10 text-white/70",
    rejected: "bg-rose-400/20 text-rose-100",
    implemented: "bg-cyan-400/20 text-cyan-100",
    improved: "bg-emerald-400/20 text-emerald-100",
    no_impact: "bg-amber-400/20 text-amber-100",
  };

  return (
    <div className={`rounded-full px-2.5 py-1 text-xs ${styles[outcome]}`}>
      {outcome.replace("_", " ")}
    </div>
  );
}