import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { cachedIntelligence } from "@/lib/evidence/cached";
import { lookUp } from "@/lib/ai/analyst";
import { loadTrust } from "@/lib/intelligence/outcomes";
import { evidenceHash, runConsensus } from "@/lib/ai/consensus";
import { recallConsensus, rememberConsensus } from "@/lib/ai/memory";
import { availableProviders, providerSummary } from "@/lib/ai/providers";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";
import { prisma } from "@/lib/prisma";
import { canSeeProject, requirePermission } from "@/lib/org/access";

const OVERVIEW_ID = "__overview__";

export const maxDuration = 60;

/**
 * POST /api/intelligence/explain { project, insightId, from, to, question? }
 * Asks every configured AI model about one finding, verifies their numbers
 * against the data and returns the consensus. Cached by evidence hash.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { project?: string; insightId?: string; from?: string; to?: string; question?: string };
  if (!body.project || !body.insightId || !body.from || !body.to) {
    return NextResponse.json({ ok: false, error: "project, insightId, from and to are required." }, { status: 400 });
  }

  const access = await requirePermission("ai");
  if (access instanceof NextResponse) return access;

  const project = await getProjectMapping({ ref: body.project, workspaceId });
  if (!canSeeProject(access, project.projectSlug)) {
    return NextResponse.json({ ok: false, error: "You don't have access to this project." }, { status: 403 });
  }
  const output = await cachedIntelligence({
    workspaceId,
    projectId: project.projectId,
    projectSlug: project.projectSlug,
    projectLabel: project.projectLabel,
    from: body.from,
    to: body.to,
  });
  const question = body.question?.slice(0, 400);
  if (body.insightId === OVERVIEW_ID && !question?.trim()) {
    return NextResponse.json({ ok: false, error: "Type a question about this project." }, { status: 400 });
  }
  // Free tiers that may train on prompts only ever see the founder's own test data.
  const isFounder = workspaceId === (await resolveFounderWorkspaceId());
  const allowTraining = isFounder || process.env.ANITRYA_AI_ALLOW_TRAINING_PROVIDERS === "true";

  // "__overview__" is the Overview copilot: the question is asked of the whole
  // project, with every finding as the base evidence.
  let insight = output.insights.find((i) => i.insightId === body.insightId);
  if (!insight && body.insightId === OVERVIEW_ID && output.insights.length > 0) {
    const top = output.insights[0];
    insight = {
      ...top,
      insightId: OVERVIEW_ID,
      title: `${project.projectLabel}: ${output.insights.length} findings for ${body.from} to ${body.to}`,
      finding: output.insights.slice(0, 6).map((i, n) => `${n + 1}. ${i.title} — ${i.finding}`).join(" "),
      recommendedAction: top.recommendedAction,
      comparison: undefined,
      impactValue: undefined,
      rowHeaders: ["Item", "Details"],
      rows: output.insights.slice(0, 6).map((i) => ({
        label: `[Finding] ${i.title}`,
        values: [`impact ${i.impactValue ? `${i.impactValue} ${i.impactUnit ?? ""}`.trim() : "—"}, confidence ${i.confidence ? `${Math.round(i.confidence * 100)}%` : "—"}`],
      })),
    };
  }
  if (!insight) return NextResponse.json({ ok: false, error: "Finding not found for this range." }, { status: 404 });

  // A typed question gets its own lookups: the AI picks the measurements it
  // needs (top queries that lost clicks, visitors by city…) and they are added
  // to the evidence, so the answer can go beyond the finding itself.
  let lookups: string[] = [];
  if (question?.trim()) {
    const found = await lookUp({ workspaceId, projectSlug: project.projectSlug, from: body.from, to: body.to, question, allowTraining }).catch(() => null);
    if (found?.sections.length) {
      lookups = found.sections.map((section) => section.title);
      const extra = found.sections.flatMap((section) =>
        section.rows.map((row) => ({
          label: `[${section.title}] ${row.label}`,
          values: [row.values.map((value, i) => `${section.headers[i + 1] ?? ""} ${value}`.trim()).join(", ")],
        })),
      );
      insight = { ...insight, rowHeaders: insight.insightId === OVERVIEW_ID ? insight.rowHeaders : ["Item", "Details"], rows: [...(insight.insightId === OVERVIEW_ID ? insight.rows ?? [] : (insight.rows ?? []).map((r) => ({ label: r.label, values: [r.values.join(", ")] }))), ...extra] };
    }
  }

  const hash = evidenceHash(insight, question?.trim() || "Why is this happening, and what should we do first?");
  const remembered = await recallConsensus(workspaceId, hash);
  if (remembered) return NextResponse.json({ ok: true, cached: true, consensus: remembered, lookups });

  // Plan allowance: only fresh (non-remembered) answers count.
  const used = await prisma
    .$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM ai_memory WHERE workspace_id = $1 AND created_at >= date_trunc('month', NOW())`,
      workspaceId,
    )
    .then((r) => Number(r[0]?.n ?? 0))
    .catch(() => 0);
  if (used >= access.limits.aiPerMonth) {
    return NextResponse.json({ ok: false, error: `This month's ${access.limits.aiPerMonth} AI questions on the ${access.limits.label} plan are used up.` }, { status: 429 });
  }

  if (availableProviders({ allowTraining }).length === 0) {
    return NextResponse.json({ ok: false, error: "No AI provider key is configured yet.", providers: providerSummary() }, { status: 409 });
  }

  // Models whose past advice on this kind of finding worked count for more.
  const weightFor = await loadTrust(workspaceId).catch(() => undefined);
  const consensus = await runConsensus({ insight, question, allowTraining, weightFor });
  if (consensus.models.some((m) => m.ok)) {
    after(() => rememberConsensus({ workspaceId, projectSlug: project.projectSlug, category: insight.category, consensus }));
  }
  return NextResponse.json({ ok: true, cached: false, consensus, lookups });
}

/** Which AI providers are configured (no secrets returned). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, providers: providerSummary() });
}
