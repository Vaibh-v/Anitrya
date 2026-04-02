"use client";

type Props = {
  projectId: string;
};

export function SettingsOpsStatusPanel({ projectId }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="text-2xl font-semibold text-white">Operational status</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          The control layer now has visible project context, sync actions, and
          export actions. This is where the product moves from static structure
          to active evidence hydration.
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Project id
            </div>
            <div className="mt-2 text-lg font-semibold text-white">{projectId}</div>
            <div className="mt-2 text-sm text-white/55">
              Current target for sync and export actions.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Sync surface
            </div>
            <div className="mt-2 text-lg font-semibold text-white">active</div>
            <div className="mt-2 text-sm text-white/55">
              Manual sync is now visible inside Settings.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              Export surface
            </div>
            <div className="mt-2 text-lg font-semibold text-white">active</div>
            <div className="mt-2 text-sm text-white/55">
              Export action is now visible inside Settings.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="text-2xl font-semibold text-white">Terminal test commands</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          Use these from Codespaces terminal to verify routes directly.
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/70">
            curl -X POST http://localhost:3000/api/sync/run
          </div>
          <div className="rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/70">
            curl -X POST http://localhost:3000/api/intelligence/export-customer-sheet
          </div>
          <div className="rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/70">
            curl http://localhost:3000/api/sync/status
          </div>
        </div>
      </div>
    </div>
  );
}