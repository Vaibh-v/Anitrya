"use client";

type MemorySnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  headline: string;
  summary: string;
  categories: string[];
  confidence: "low" | "medium" | "high";
};

export function MemorySnapshotPanel({
  snapshots,
}: {
  snapshots: MemorySnapshot[];
}) {
  if (!snapshots.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold text-white">
          Learned intelligence memory
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/55">
          No persisted memory snapshots are available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white">
        Learned intelligence memory
      </div>

      <div className="mt-4 space-y-3">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="rounded-xl border border-white/10 bg-black/16 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">
                  {snapshot.headline}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/60">
                  {snapshot.summary}
                </div>
              </div>

              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                {snapshot.confidence}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.categories.length > 0 ? (
                snapshot.categories.map((category) => (
                  <div
                    key={category}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60"
                  >
                    {category}
                  </div>
                ))
              ) : (
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/45">
                  no categories written yet
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-white/45">
              {new Date(snapshot.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}