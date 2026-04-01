"use client";

export function ExecutionStatusBadge({
  status,
}: {
  status: "pending" | "in_progress" | "blocked" | "completed";
}) {
  const styles = {
    pending: "bg-white/10 text-white/60",
    in_progress: "bg-cyan-400/20 text-cyan-100",
    blocked: "bg-amber-400/20 text-amber-100",
    completed: "bg-emerald-400/20 text-emerald-100",
  };

  return (
    <div
      className={`rounded-full px-2 py-1 text-xs ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </div>
  );
}