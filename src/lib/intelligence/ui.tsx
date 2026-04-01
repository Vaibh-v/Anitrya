import Link from "next/link";
import type { ReactNode } from "react";

export type DateRangeValue = {
  preset?: string;
  from?: string;
  to?: string;
};

type DateRangeToolbarProps = {
  basePath: string;
  projectSlug?: string | null;
  workspaceId?: string | null;
  range: DateRangeValue;
};

export function DateRangeToolbar({
  basePath,
  projectSlug,
  workspaceId,
  range,
}: DateRangeToolbarProps) {
  const presets = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "custom", label: "Custom" },
  ];

  function hrefForPreset(preset: string) {
    const params = new URLSearchParams();

    if (projectSlug) params.set("project", projectSlug);
    if (workspaceId) params.set("workspace", workspaceId);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    params.set("preset", preset);

    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">
            Date range
          </div>
          <div className="mt-2 text-sm text-white/70">
            {range.from && range.to ? `${range.from} → ${range.to}` : "Current project range"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = (range.preset ?? "30d") === preset.key;

            return (
              <Link
                key={preset.key}
                href={hrefForPreset(preset.key)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-white/58 hover:bg-white/[0.05]"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ProjectBadgeProps = {
  label: string;
  sublabel?: string;
};

export function ProjectBadge({ label, sublabel }: ProjectBadgeProps) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-right">
      <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
        Active project
      </div>
      <div className="mt-1 text-sm font-medium text-white">{label}</div>
      {sublabel ? (
        <div className="mt-1 text-[11px] text-white/45">{sublabel}</div>
      ) : null}
    </div>
  );
}

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-white/56">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export type DiagnosticCard = {
  id?: string;
  title?: string;
  summary?: string;
  evidence?: string[];
  actions?: string[];
  confidence?: string;
  score?: number;
  nextStep?: string;
};

type DiagnosticsPanelProps = {
  title: string;
  subtitle?: string;
  diagnostics: DiagnosticCard[];
};

export function DiagnosticsPanel({
  title,
  subtitle,
  diagnostics,
}: DiagnosticsPanelProps) {
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {safeDiagnostics.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-white">No diagnostics available</div>
          <p className="mt-2 text-sm leading-6 text-white/52">
            Evidence is still limited for this section. Run sync and review connected sources.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {safeDiagnostics.map((diagnostic, index) => {
            const evidence = Array.isArray(diagnostic.evidence) ? diagnostic.evidence : [];
            const actions = Array.isArray(diagnostic.actions) ? diagnostic.actions : [];
            const key = diagnostic.id ?? `${title}-${index}`;

            return (
              <div
                key={key}
                className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-base font-semibold text-white">
                      {diagnostic.title ?? "Untitled diagnostic"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/60">
                      {diagnostic.summary ?? "No summary available."}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {typeof diagnostic.confidence === "string" ? (
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-100">
                        {diagnostic.confidence}
                      </div>
                    ) : null}

                    {typeof diagnostic.score === "number" ? (
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/65">
                        Score {diagnostic.score}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[16px] border border-white/10 bg-black/16 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                      Evidence
                    </div>
                    <div className="mt-3 space-y-3">
                      {evidence.length > 0 ? (
                        evidence.map((item) => (
                          <div
                            key={item}
                            className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
                          >
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
                          No evidence points attached yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-white/10 bg-black/16 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                      Actions
                    </div>
                    <div className="mt-3 space-y-3">
                      {actions.length > 0 ? (
                        actions.map((action) => (
                          <div
                            key={action}
                            className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
                          >
                            {action}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
                          No actions attached yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {diagnostic.nextStep ? (
                  <div className="mt-4 rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-4 text-sm text-emerald-100">
                    {diagnostic.nextStep}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}