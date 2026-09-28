import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { cachedIntelligence } from "@/lib/evidence/cached";
import { canSeeProject, requirePermission, audit } from "@/lib/org/access";
import { evidenceHash } from "@/lib/ai/consensus";
import { recallConsensus } from "@/lib/ai/memory";
import { PROVIDERS } from "@/lib/ai/providers";
import { markDone } from "@/lib/intelligence/outcomes";

/**
 * POST { project, insightId, from, to } — marks a finding's recommendation as
 * done. The baseline is recorded now and the result is measured in 4 weeks.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { project?: string; insightId?: string; from?: string; to?: string };
  if (!body.project || !body.insightId || !body.from || !body.to) {
    return NextResponse.json({ ok: false, error: "project, insightId, from and to are required." }, { status: 400 });
  }
  const access = await requirePermission("sync");
  if (access instanceof NextResponse) return access;
  const project = await getProjectMapping({ ref: body.project, workspaceId });
  if (!canSeeProject(access, project.projectSlug)) return NextResponse.json({ ok: false, error: "No access to this project." }, { status: 403 });

  const output = await cachedIntelligence({ workspaceId, projectId: project.projectId, projectSlug: project.projectSlug, projectLabel: project.projectLabel, from: body.from, to: body.to });
  const insight = output.insights.find((i) => i.insightId === body.insightId);
  if (!insight) return NextResponse.json({ ok: false, error: "Finding not found for this range." }, { status: 404 });

  // Credit the models that explained this finding, if the AI panel was asked.
  const remembered = await recallConsensus(workspaceId, evidenceHash(insight, "Why is this happening, and what should we do first?"));
  const providers = (remembered?.models ?? [])
    .filter((m) => m.ok)
    .map((m) => PROVIDERS.find((p) => p.label === m.provider)?.id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  const result = await markDone({ workspaceId, projectSlug: project.projectSlug, insight, providers, email: access.email });
  await audit(access, "outcome.marked", { project: project.projectSlug, category: insight.category });
  return NextResponse.json({ ok: true, ...result });
}
