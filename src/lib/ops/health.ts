/**
 * Anitrya checks itself. One report covers what can silently break: stale
 * syncs, failing Google connections, AI models that stopped answering, the
 * database nearing its plan limit, and email delivery. The nightly job emails
 * the founder only when something needs attention.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { providerHealth } from "@/lib/ai/provider-health";
import { availableProviders, PROVIDERS } from "@/lib/ai/providers";
import { getStorageStatus } from "@/lib/storage/storage-manager";
import { emailConfigured, emailSender } from "@/lib/email/weekly-digest";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";

export type Check = { area: string; status: "ok" | "warn" | "fail"; detail: string };

const hoursAgo = (d: Date | null) => (d ? Math.round((Date.now() - new Date(d).getTime()) / 3600_000) : null);

export async function healthReport(): Promise<{ checks: Check[]; worst: Check["status"]; at: string }> {
  await ensureAdditiveSchema();
  const checks: Check[] = [];

  // 1. Every mapped project synced in the last 36 hours.
  const projects = await prisma.project.findMany({
    where: { OR: [{ ga4PropertyId: { not: null } }, { gscSiteId: { not: null } }] },
    select: { slug: true, name: true, workspaceId: true },
  });
  const lastRuns = await prisma.$queryRawUnsafe<Array<{ workspace_id: string; slug: string; at: Date }>>(
    `SELECT "workspaceId" AS workspace_id, metadata->>'projectSlug' AS slug, MAX("startedAt") AS at
     FROM "SyncRun" WHERE status = 'SUCCESS' AND "startedAt" > NOW() - INTERVAL '30 days' GROUP BY 1, 2`,
  );
  const last = new Map(lastRuns.map((r) => [`${r.workspace_id}|${r.slug}`, r.at]));
  const stale = projects.filter((p) => {
    const h = hoursAgo(last.get(`${p.workspaceId}|${p.slug}`) ?? null);
    return h === null || h > 36;
  });
  checks.push(
    stale.length === 0
      ? { area: "Sync", status: "ok", detail: `All ${projects.length} projects synced in the last 36 hours.` }
      : { area: "Sync", status: stale.length > projects.length / 2 ? "fail" : "warn", detail: `${stale.length} of ${projects.length} projects haven't synced in 36 hours: ${stale.slice(0, 5).map((p) => p.name).join(", ")}.` },
  );

  // 2. Google connections failing (token revoked, quota, permission).
  const failures = await prisma.$queryRawUnsafe<Array<{ source: string; n: bigint; error: string | null }>>(
    `SELECT source::text AS source, COUNT(*)::bigint AS n, MAX(error) AS error FROM "SyncRun"
     WHERE status = 'FAILED' AND "startedAt" > NOW() - INTERVAL '24 hours' GROUP BY 1`,
  ).catch(() => []);
  const relevant = failures.filter((f) => f.source === "GOOGLE_GA4" || f.source === "GOOGLE_GSC");
  checks.push(
    relevant.length === 0
      ? { area: "Google data", status: "ok", detail: "No GA4 or Search Console sync failures in the last 24 hours." }
      : { area: "Google data", status: "warn", detail: relevant.map((f) => `${f.source.replace("GOOGLE_", "")}: ${Number(f.n)} failed (${(f.error ?? "").slice(0, 120)})`).join(" · ") },
  );

  // 3. AI panel: how many models are answering.
  const configured = availableProviders({ allowTraining: true });
  const health = await providerHealth();
  const answering = health.filter((h) => h.ok && (hoursAgo(h.checked_at) ?? 999) < 72).map((h) => PROVIDERS.find((p) => p.id === h.provider)?.label ?? h.provider);
  const failing = health.filter((h) => !h.ok).map((h) => `${PROVIDERS.find((p) => p.id === h.provider)?.label ?? h.provider} (${(h.error ?? "").slice(0, 60)})`);
  checks.push({
    area: "AI panel",
    status: answering.length >= 2 ? "ok" : answering.length === 1 ? "warn" : configured.length ? "warn" : "fail",
    detail: `${answering.length} of ${configured.length} configured models answering${answering.length ? `: ${answering.join(", ")}` : ""}.${failing.length ? ` Not answering: ${failing.join("; ")}.` : ""}`,
  });

  // 4. Database inside its plan.
  const storage = await getStorageStatus().catch(() => null);
  if (storage && storage.usedMb !== null) {
    const used = storage.usedMb;
    const pct = storage.limitMb ? used / storage.limitMb : 0;
    checks.push({
      area: "Database",
      status: pct >= 0.9 ? "fail" : pct >= 0.75 ? "warn" : "ok",
      detail: storage.limitMb ? `${Math.round(used)} MB of ${storage.limitMb} MB used (${Math.round(pct * 100)}%, ${storage.mode} mode).` : `${Math.round(used)} MB used (full mode).`,
    });
  }

  // 5. Email.
  checks.push(
    emailConfigured()
      ? { area: "Email", status: "ok", detail: `Weekly email sends from ${await emailSender()}.` }
      : { area: "Email", status: "warn", detail: "RESEND_API_KEY is not set; weekly emails are off." },
  );

  // 6. Instant Insight: time from new project to first insight (last 20 onboardings).
  const timings = await prisma
    .$queryRawUnsafe<Array<{ seconds: number; timed_out: boolean }>>(
      `SELECT (detail->>'seconds')::int AS seconds, COALESCE((detail->>'timedOut')::boolean, false) AS timed_out
       FROM audit_log WHERE action = 'onboarding.first_insight' ORDER BY created_at DESC LIMIT 20`,
    )
    .catch(() => []);
  if (timings.length) {
    const sorted = timings.map((t) => t.seconds).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const over = timings.filter((t) => t.seconds > 59 || t.timed_out).length;
    checks.push({
      area: "Instant Insight",
      status: over === 0 ? "ok" : over <= timings.length / 4 ? "warn" : "fail",
      detail: `Median ${median}s from new project to first insight over the last ${timings.length} onboardings; ${over} over 59s.`,
    });
  }

  // 7. Scheduled jobs.
  checks.push(
    process.env.CRON_SECRET?.trim()
      ? { area: "Scheduled jobs", status: "ok", detail: "Nightly sync and Monday email are scheduled." }
      : { area: "Scheduled jobs", status: "fail", detail: "CRON_SECRET is missing, so nightly jobs are refused." },
  );

  const order = { ok: 0, warn: 1, fail: 2 } as const;
  const worst = checks.reduce<Check["status"]>((w, c) => (order[c.status] > order[w] ? c.status : w), "ok");
  return { checks, worst, at: new Date().toISOString() };
}

async function founderEmail(): Promise<string | null> {
  const configured = process.env.ANITRYA_FOUNDER_EMAIL?.trim();
  if (configured) return configured;
  const workspaceId = await resolveFounderWorkspaceId();
  if (!workspaceId) return null;
  const first = await prisma.membership.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true } } } });
  return first?.user.email ?? null;
}

/** Nightly: email the founder when any check is not OK. */
export async function alertFounderIfNeeded() {
  const report = await healthReport();
  if (report.worst === "ok" || !emailConfigured()) return { alerted: false, worst: report.worst };
  const to = await founderEmail();
  if (!to) return { alerted: false, worst: report.worst };
  const rows = report.checks
    .filter((c) => c.status !== "ok")
    .map((c) => `<li style="margin:0 0 8px"><strong style="color:${c.status === "fail" ? "#dc2626" : "#d97706"}">${c.area}</strong> — ${c.detail.replace(/</g, "&lt;")}</li>`)
    .join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: await emailSender(),
      to: [to],
      subject: `Anitrya health: ${report.worst === "fail" ? "action needed" : "worth a look"}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px"><h2 style="margin:0 0 12px">Anitrya daily health check</h2><ul style="padding-left:18px">${rows}</ul><p style="color:#64748b;font-size:12px">Everything else is OK. Full report: Settings → Health.</p></div>`,
    }),
  }).catch(() => null);
  return { alerted: Boolean(response?.ok), worst: report.worst };
}
