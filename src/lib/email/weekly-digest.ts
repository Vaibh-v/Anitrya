/**
 * Monday insight email: per project, 4 KPIs vs the previous week and the top 3
 * findings with their actions, built from data already synced. Sent with
 * Resend when RESEND_API_KEY is set. The sender comes from ANITRYA_EMAIL_FROM
 * or the first domain verified in Resend (see emailSender).
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { getBehaviorDetail, getSeoDetail } from "@/lib/evidence/page-insights";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";

const APP_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://anitrya.vercel.app";

export const TEST_SENDER = "Anitrya <onboarding@resend.dev>";
export const PRODUCT_SENDER = "Anitrya <insights@anitrya.com>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

let senderCache: { value: string; at: number } | null = null;

/**
 * ANITRYA_EMAIL_FROM when set; otherwise the first domain verified in Resend
 * (insights@<domain>), so verifying a domain there is all it takes. Falls
 * back to Resend's test sender until a domain is verified.
 */
export async function emailSender(): Promise<string> {
  const configured = process.env.ANITRYA_EMAIL_FROM?.trim();
  if (configured) return configured;
  if (senderCache && Date.now() - senderCache.at < 15 * 60_000) return senderCache.value;
  // Sending-only Resend keys can't list domains; the product domain is the default.
  let value = PRODUCT_SENDER;
  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    const payload = (await response.json().catch(() => null)) as { data?: Array<{ name?: string; status?: string }> } | null;
    const verified = payload?.data?.find((d) => d.status === "verified" && d.name);
    if (verified) value = `Anitrya <insights@${verified.name}>`;
    else if (response.ok) value = TEST_SENDER;
  } catch {
    /* keep the test sender */
  }
  senderCache = { value, at: Date.now() };
  return value;
}

export function unsubscribeToken(email: string) {
  return crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "anitrya").update(email.toLowerCase()).digest("hex").slice(0, 32);
}

function day(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
function delta(cur: number, prev: number) {
  if (!prev) return "";
  const pct = ((cur - prev) / prev) * 100;
  const color = pct >= 0 ? "#1f9d6b" : "#c2410c";
  return ` <span style="color:${color}">${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}%</span>`;
}

/** One plain-English sentence about the week, like an analyst would open with. */
export function weekHeadline(sessions: number, prevSessions: number, clicks: number, prevClicks: number, conversions: number) {
  const move = (cur: number, prev: number, noun: string) => {
    if (!prev) return `${fmt(cur)} ${noun}`;
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (Math.abs(pct) < 3) return `${noun} held steady at ${fmt(cur)}`;
    return `${noun} ${pct > 0 ? "rose" : "fell"} ${Math.abs(pct)}% to ${fmt(cur)}`;
  };
  const a = move(sessions, prevSessions, "visits");
  const b = move(clicks, prevClicks, "search clicks");
  const c = conversions ? `, with ${fmt(conversions)} ${conversions === 1 ? "conversion" : "conversions"}` : "";
  return `Last week ${a} and ${b}${c}.`;
}

async function projectSection(workspaceId: string, project: { id: string; slug: string; name: string }) {
  const cur = { workspaceId, projectSlug: project.slug, from: day(7), to: day(1) };
  const prev = { workspaceId, projectSlug: project.slug, from: day(14), to: day(8) };
  const [seo, seoPrev, beh, behPrev, intel] = await Promise.all([
    getSeoDetail(cur),
    getSeoDetail(prev),
    getBehaviorDetail(cur),
    getBehaviorDetail(prev),
    runIntelligence({ workspaceId, projectId: project.id, projectSlug: project.slug, projectLabel: project.name, from: day(28), to: day(1) }).catch(() => null),
  ]);
  if (seo.queryRows === 0 && beh.sourceRows === 0) return null;
  const kpis = [
    ["Sessions", beh.sessions, behPrev.sessions],
    ["Conversions", beh.conversions, behPrev.conversions],
    ["Organic clicks", seo.clicks, seoPrev.clicks],
    ["Impressions", seo.impressions, seoPrev.impressions],
  ] as const;
  const findings = (intel?.insights ?? []).filter((i) => i.category !== "data_gap").slice(0, 3);
  const link = `${APP_URL}/home/intelligence?project=${encodeURIComponent(project.slug)}`;
  const headline = weekHeadline(beh.sessions, behPrev.sessions, seo.clicks, seoPrev.clicks, beh.conversions);
  return `
    <h2 style="margin:28px 0 8px;font-size:18px;color:#0b1220">${esc(project.name)}</h2>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.55">${esc(headline)}${findings[0] ? ` <strong>The one thing to do this week:</strong> ${esc(findings[0].recommendedAction)}` : ""}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${kpis
      .map(([label, c, p]) => `<tr><td style="padding:6px 0;color:#475569">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600">${fmt(c)}${delta(c, p)}</td></tr>`)
      .join("")}</table>
    ${findings.length ? `<h3 style="margin:16px 0 6px;font-size:14px;color:#0b1220">Top findings</h3>` : ""}
    ${findings
      .map((f, i) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5"><strong>${i + 1}. ${esc(f.title)}</strong><br><span style="color:#475569">Do this: ${esc(f.recommendedAction)}</span></p>`)
      .join("")}
    <p style="margin:12px 0 0"><a href="${link}" style="background:#0ea5b7;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">Open ${esc(project.name)} in Anitrya</a></p>`;
}

export async function sendWeeklyDigests(options: { onlyWorkspaceId?: string; onlyEmail?: string } = {}): Promise<{
  sent: number;
  skipped: string | null;
  errors: number;
  firstError?: string;
  sender?: string;
}> {
  if (!emailConfigured()) return { sent: 0, skipped: "RESEND_API_KEY not set", errors: 0 };
  const sender = await emailSender();
  await ensureAdditiveSchema();
  const optedOut = new Set(
    (await prisma.$queryRawUnsafe<Array<{ email: string }>>(`SELECT email FROM email_optout`).catch(() => [])).map((r) => r.email.toLowerCase()),
  );
  const workspaces = await prisma.workspace.findMany({
    where: options.onlyWorkspaceId ? { id: options.onlyWorkspaceId } : undefined,
    select: { id: true, name: true, projects: { select: { id: true, slug: true, name: true } }, memberships: { select: { user: { select: { email: true } } } } },
  });

  let sent = 0;
  let errors = 0;
  let firstError: string | undefined;
  for (const workspace of workspaces) {
    const recipients = options.onlyEmail
      ? [options.onlyEmail]
      : workspace.memberships.map((m) => m.user.email).filter((e): e is string => Boolean(e) && !optedOut.has(e!.toLowerCase()));
    if (recipients.length === 0 || workspace.projects.length === 0) continue;
    const sections = (await Promise.all(workspace.projects.map((p) => projectSection(workspace.id, p).catch(() => null)))).filter(Boolean);
    if (sections.length === 0) continue;

    for (const email of recipients) {
      const unsubscribe = `${APP_URL}/api/email/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
      const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0b1220">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#0ea5b7;margin:0">Anitrya · Weekly insight</p>
        <h1 style="font-size:22px;margin:6px 0 0">Your week in 60 seconds</h1>
        <p style="color:#475569;font-size:14px;margin:6px 0 0">Last 7 days compared with the 7 days before.</p>
        ${sections.join("")}
        <p style="margin:32px 0 0;font-size:12px;color:#94a3b8">You get this every Monday. <a href="${unsubscribe}" style="color:#94a3b8">Unsubscribe</a></p>
      </div>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: sender,
          to: [email],
          subject: `Your weekly Anitrya insight — ${workspace.projects.length} project${workspace.projects.length === 1 ? "" : "s"}`,
          html,
          headers: { "List-Unsubscribe": `<${unsubscribe}>` },
        }),
      }).catch(() => null);
      if (response?.ok) sent++;
      else {
        errors++;
        if (!firstError) {
          const detail = response ? await response.json().catch(() => null) : null;
          firstError = response ? `Resend ${response.status}: ${detail?.message ?? response.statusText}` : "Could not reach Resend";
        }
      }
    }
  }
  return { sent, skipped: null, errors, firstError, sender };
}
