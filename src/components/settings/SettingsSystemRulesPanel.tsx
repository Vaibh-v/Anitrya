export function SettingsSystemRulesPanel() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="text-2xl font-semibold text-white">Operational standard</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          These rules keep the control plane aligned with the evidence-backed system you are building.
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
            Failures must remain visible and explainable.
          </div>
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
            Intelligence must remain evidence-backed and project-scoped.
          </div>
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
            Future integrations must plug into the same normalized reasoning layer.
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="text-2xl font-semibold text-white">Why this page matters</div>
        <div className="mt-2 text-sm leading-6 text-white/60">
          Settings is the operational control layer for sync, export, provider readiness, and project resolution.
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4 text-sm text-white/72">
            Sync must be visible before evidence can be trusted anywhere else.
          </div>
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4 text-sm text-white/72">
            Export must be verifiable so customer-facing sheets reflect real project intelligence.
          </div>
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-4 text-sm text-white/72">
            Mapping discipline prevents false reads across Overview, SEO, Behavior, and Intelligence.
          </div>
        </div>
      </div>
    </div>
  );
}