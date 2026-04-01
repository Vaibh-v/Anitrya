import { SectionCard } from "@/lib/intelligence/ui";
import { KpiStrip } from "@/components/shared/KpiStrip";
import { ProviderStatusBadge } from "@/components/settings/ProviderStatusBadge";
import type {
  ProviderStateRecord,
  ProviderStateSummaryCard,
} from "@/lib/integrations/provider-state-contracts";

type Props = {
  title?: string;
  subtitle?: string;
  projectName: string;
  records: ProviderStateRecord[];
  summaryCards: ProviderStateSummaryCard[];
};

export function ProviderStatePanel({
  title = "Provider connection state",
  subtitle = "Current reserved, wired, blocked, and connected state across future provider surfaces.",
  projectName,
  records,
  summaryCards,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionCard title={title} subtitle={subtitle}>
        <KpiStrip
          items={summaryCards.map((card) => ({
            label: card.label,
            value: card.value,
            context: card.context,
          }))}
        />
      </SectionCard>

      <SectionCard
        title="Provider state ledger"
        subtitle="Project-scoped readiness for GBP, Google Ads, and Google Trends."
      >
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {record.label}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/38">
                    {projectName}
                  </div>
                </div>

                <ProviderStatusBadge state={record.state} />
              </div>

              <p className="mt-3 text-sm leading-6 text-white/58">
                {record.reason}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Provider id
                  </div>
                  <div className="mt-2 text-sm text-white/72">
                    {record.providerId}
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/10 bg-black/16 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    Updated at
                  </div>
                  <div className="mt-2 text-sm text-white/72">
                    {record.updatedAt === new Date(0).toISOString()
                      ? "Not written yet"
                      : new Date(record.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}