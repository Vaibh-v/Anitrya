/**
 * Trial reminders to the organization owner: 3 days before the trial ends and
 * on the day it ends. Each notice is sent once (tracked on org_plan.notices).
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { emailConfigured, emailSender } from "@/lib/email/weekly-digest";

const APP_URL = () => process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

type Row = { workspace_id: string; name: string; trial_ends_at: Date; notices: string[] | null };

export function dueNotice(trialEndsAt: Date, sent: string[], now = new Date()): "trial_3d" | "trial_ended" | null {
  const hoursLeft = (trialEndsAt.getTime() - now.getTime()) / 3600_000;
  if (hoursLeft <= 0 && hoursLeft > -72 && !sent.includes("trial_ended")) return "trial_ended";
  if (hoursLeft > 0 && hoursLeft <= 72 && !sent.includes("trial_3d")) return "trial_3d";
  return null;
}

export async function sendTrialNotices() {
  if (!emailConfigured()) return { sent: 0, skipped: "email off" };
  await ensureAdditiveSchema();
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT p.workspace_id, w.name, p.trial_ends_at, p.notices FROM org_plan p JOIN "Workspace" w ON w.id = p.workspace_id
     WHERE p.plan = 'trial' AND p.is_test = false AND p.trial_ends_at BETWEEN NOW() - INTERVAL '3 days' AND NOW() + INTERVAL '3 days'`,
  );
  const from = await emailSender();
  let sent = 0;
  for (const row of rows) {
    const notices = Array.isArray(row.notices) ? row.notices : [];
    const due = dueNotice(new Date(row.trial_ends_at), notices);
    if (!due) continue;
    const owner = await prisma.membership.findFirst({ where: { workspaceId: row.workspace_id }, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true, name: true } } } });
    const to = owner?.user.email;
    if (!to) continue;
    const link = `${APP_URL()}/home/settings#billing`;
    const ended = due === "trial_ended";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: ended ? "Your Anitrya trial has ended — your data is safe" : "3 days left in your Anitrya trial",
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#0b1220">
          <p>Hi ${(owner?.user.name ?? "").split(" ")[0] || "there"},</p>
          <p>${ended
            ? `The free trial for <strong>${row.name}</strong> has ended. Your dashboards and history are kept, but syncing and AI answers are paused until you choose a plan.`
            : `Your free trial for <strong>${row.name}</strong> ends in 3 days. Choose a plan to keep your data syncing and your weekly insights coming.`}</p>
          <p><a href="${link}" style="background:#0ea5b7;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Choose a plan</a></p>
          <p style="color:#64748b;font-size:12px">Questions? Just reply to this email.</p></div>`,
      }),
    }).catch(() => null);
    if (!response?.ok) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE org_plan SET notices = COALESCE(notices, '[]'::jsonb) || to_jsonb($2::text) WHERE workspace_id = $1`,
      row.workspace_id,
      due,
    );
    sent++;
  }
  return { sent, skipped: null };
}
