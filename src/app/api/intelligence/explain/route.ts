import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { cachedIntelligence } from "@/lib/evidence/cached";
import { evidenceHash, runConsensus } from "@/lib/ai/consensus";
import { recallConsensus, rememberConsensus } from "@/lib/ai/memory";
import { availableProviders, providerSummary } from "@/lib/ai/providers";
import { resolveFounderWorkspaceId } from "@/lib/intelligence/owner-network/owner-auth";

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

  const project = await getProjectMapping({ ref: body.project, workspaceId });
  const output = await cachedIntelligence({
    workspaceId,
    projectId: project.projectId,
    projectSlug: project.projectSlug,
    projectLabel: project.projectLabel,
    from: body.from,
    to: body.to,
  });
  const insight = output.insights.find((i) => i.insightId === body.insightId);
  if (!insight) return NextResponse.json({ ok: false, error: "Finding not found for this range." }, { status: 404 });

  const question = body.question?.slice(0, 400);
  const hash = evidenceHash(insight, question?.trim() || "Why is this happening, and what should we do first?");
  const remembered = await recallConsensus(workspaceId, hash);
  if (remembered) return NextResponse.json({ ok: true, cached: true, consensus: remembered });

  // Free tiers that may train on prompts only ever see the founder's own test data.
  const isFounder = workspaceId === (await resolveFounderWorkspaceId());
  const allowTraining = isFounder || process.env.ANITRYA_AI_ALLOW_TRAINING_PROVIDERS === "true";
  if (availableProviders({ allowTraining }).length === 0) {
    return NextResponse.json({ ok: false, error: "No AI provider key is configured yet.", providers: providerSummary() }, { status: 409 });
  }

  const consensus = await runConsensus({ insight, question, allowTraining });
  if (consensus.models.some((m) => m.ok)) {
    after(() => rememberConsensus({ workspaceId, projectSlug: project.projectSlug, category: insight.category, consensus }));
  }
  return NextResponse.json({ ok: true, cached: false, consensus });
}

/** Which AI providers are configured (no secrets returned). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, providers: providerSummary() });
}
