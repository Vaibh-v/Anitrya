import type {
  ProjectIntegrationHealth,
  ProviderHealthRecord,
  ProviderHealthState,
} from "@/lib/integrations/provider-health-contracts";
import type { IntegrationKey } from "@/lib/integrations/integration-contracts";

type Props = {
  health: ProjectIntegrationHealth;
};

const DISPLAYED_PROVIDERS: IntegrationKey[] = [
  "google_ga4",
  "google_gsc",
  "google_business_profile",
  "google_ads",
  "google_trends",
  "semrush",
];

function stateClasses(state: ProviderHealthState) {
  if (state === "ready") {
    return "border-emerald-300/20 bg-emerald-300/8 text-emerald-100";
  }

  if (state === "partial") {
    return "border-cyan-300/20 bg-cyan-300/8 text-cyan-100";
  }

  if (state === "missing") {
    return "border-amber-300/20 bg-amber-300/8 text-amber-100";
  }

  if (state === "blocked") {
    return "border-rose-300/24 bg-rose-300/10 text-rose-100";
  }

  return "border-white/10 bg-white/[0.03] text-white/62";
}

function readinessText(record: ProviderHealthRecord) {
  if (record.syncCapable) return "Syncable";
  if (record.connected && record.mapped) return "Connected, not syncable";
  if (record.connected) return "Connected, needs mapping";
  if (record.state === "preserved") return "Preserved";
  return "Not connected";
}

function formatLastSync(record: ProviderHealthRecord) {
  if (!record.lastSyncAt) return "No sync recorded";

  return `${record.lastSyncStatus} · ${record.lastSyncRows} rows · ${new Date(
    record.lastSyncAt,
  ).toLocaleString()}`;
}

export function IntegrationReadinessPanel({ health }: Props) {
  const records = DISPLAYED_PROVIDERS.map((key) =>
    health.records.find((record) => record.key === key),
  ).filter((record): record is ProviderHealthRecord => Boolean(record));

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,29,70,0.9),rgba(4,14,36,0.95))] px-8 py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[30px] font-semibold tracking-[-0.03em] text-white">
            Integration readiness
          </h2>
          <p className="mt-3 max-w-[880px] text-[17px] leading-8 text-white/66">
            Provider-by-provider readiness for connection, mapping, syncability,
            evidence coverage, and intelligence input.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-4">
          {[
            ["Connected", health.providersConnected],
            ["Ready", health.providersReady],
            ["Evidence", health.evidenceReady],
            ["Intel", health.intelligenceReady],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                {label}
              </div>
              <div className="mt-1 text-[18px] font-semibold text-white">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {records.map((record) => (
          <div
            key={record.key}
            className="rounded-[22px] border border-white/10 bg-black/12 px-5 py-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold text-white">
                  {record.label}
                </div>
                <div className="mt-2 text-[14px] text-white/52">
                  {readinessText(record)}
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-[12px] uppercase tracking-[0.14em] ${stateClasses(
                  record.state,
                )}`}
              >
                {record.state}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Connected", record.connected ? "Yes" : "No"],
                ["Mapped", record.mapped ? "Yes" : "No"],
                ["Syncable", record.syncCapable ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div
                  key={`${record.key}-${label}`}
                  className="rounded-[14px] border border-white/10 bg-white/[0.02] px-3 py-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                    {label}
                  </div>
                  <div className="mt-2 text-[14px] font-medium text-white/78">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Last sync
              </div>
              <div className="mt-2 text-[14px] leading-6 text-white/62">
                {formatLastSync(record)}
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Next action
              </div>
              <div className="mt-2 text-[14px] leading-6 text-white/62">
                {record.nextAction}
              </div>
            </div>

            {record.missingRequirements.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {record.missingRequirements.map((requirement) => (
                  <span
                    key={`${record.key}-${requirement}`}
                    className="rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[12px] text-amber-100"
                  >
                    Needs {requirement}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {health.criticalBlockers.length > 0 ? (
        <div className="mt-5 rounded-[20px] border border-rose-300/20 bg-rose-300/8 px-5 py-5">
          <div className="text-[12px] uppercase tracking-[0.2em] text-rose-100/70">
            Critical blockers
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {health.criticalBlockers.map((blocker) => (
              <div key={blocker} className="text-[14px] leading-6 text-rose-50/82">
                {blocker}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
