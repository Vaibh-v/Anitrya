"use client";

type OwnerLoad = {
  owner: "seo" | "marketing" | "ops" | "dev";
  count: number;
};

export function OwnerLoadPanel({ ownerLoad }: { ownerLoad: OwnerLoad[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/16 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
        Ownership load
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {ownerLoad.length > 0 ? (
          ownerLoad.map((item) => (
            <div
              key={item.owner}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3"
            >
              <div className="text-xs uppercase tracking-[0.16em] text-white/38">
                {item.owner}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {item.count}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/55">
            No assigned execution load yet.
          </div>
        )}
      </div>
    </div>
  );
}