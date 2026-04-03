"use client";

import { useMemo, useState } from "react";
import { IntegrationToggleCard } from "@/components/settings/IntegrationToggleCard";

export type IntegrationToggleRecord = {
  providerKey: string;
  title: string;
  description: string;
  state: "active" | "preserved" | "blocked";
  enabled: boolean;
  disabledReason?: string;
};

type Props = {
  initialRecords: IntegrationToggleRecord[];
};

export function IntegrationTogglePanel({ initialRecords }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState(
    "Toggle which active integrations should participate in sync and downstream reasoning."
  );

  const counts = useMemo(() => {
    return {
      enabled: records.filter((record) => record.enabled).length,
      active: records.filter((record) => record.state === "active").length,
      preserved: records.filter((record) => record.state === "preserved").length,
      blocked: records.filter((record) => record.state === "blocked").length,
    };
  }, [records]);

  async function handleToggle(providerKey: string, nextValue: boolean) {
    const previous = records;

    setRecords((current) =>
      current.map((record) =>
        record.providerKey === providerKey
          ? { ...record, enabled: nextValue }
          : record
      )
    );
    setStatus("saving");
    setMessage(`Saving integration state for ${providerKey}...`);

    try {
      const response = await fetch("/api/integrations/toggles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          providerKey,
          enabled: nextValue,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to update integration toggle.");
      }

      setStatus("success");
      setMessage(
        payload?.message ??
          "Integration state saved. Active providers can now participate in sync orchestration."
      );
    } catch (error) {
      setRecords(previous);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to update integration toggle."
      );
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-2xl font-semibold text-white">Integration activation controls</div>
          <div className="mt-2 text-sm leading-6 text-white/60">
            Enable only the providers that are operationally ready. Preserved providers stay visible in Settings without being forced into fake sync flows.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm xl:min-w-[280px]">
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-white/70">
            Enabled: <span className="font-semibold text-white">{counts.enabled}</span>
          </div>
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-white/70">
            Active: <span className="font-semibold text-white">{counts.active}</span>
          </div>
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-white/70">
            Preserved: <span className="font-semibold text-white">{counts.preserved}</span>
          </div>
          <div className="rounded-[16px] border border-white/10 bg-black/16 px-4 py-3 text-white/70">
            Blocked: <span className="font-semibold text-white">{counts.blocked}</span>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 rounded-[16px] border px-4 py-4 text-sm ${
          status === "error"
            ? "border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
            : status === "success"
            ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
            : status === "saving"
            ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100"
            : "border-white/10 bg-black/16 text-white/65"
        }`}
      >
        {message}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {records.map((record) => (
          <IntegrationToggleCard
            key={record.providerKey}
            providerKey={record.providerKey}
            title={record.title}
            description={record.description}
            state={record.state}
            enabled={record.enabled}
            disabledReason={record.disabledReason}
            onToggle={(nextValue) => handleToggle(record.providerKey, nextValue)}
          />
        ))}
      </div>
    </section>
  );
}