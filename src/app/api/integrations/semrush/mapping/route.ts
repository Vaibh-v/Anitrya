import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { recordSemrushDomainMapping } from "@/lib/integrations/semrush/semrush-mapping-ledger";
import { getSemrushReadiness } from "@/lib/integrations/semrush/semrush-readiness";
import {
  normalizeSemrushDatabase,
  normalizeSemrushDomain,
} from "@/lib/integrations/semrush/semrush-normalizer";
import { SEMRUSH_DEFAULT_DATABASE } from "@/lib/integrations/semrush/semrush-evidence-contract";

export const dynamic = "force-dynamic";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function resolveWorkspaceId() {
  const session = await requireSession();
  return asString(session.user?.workspaceId);
}

/** GET /api/integrations/semrush/mapping?project=<id|slug|name> */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "Missing workspaceId on session." }, { status: 401 });
    }

    const projectRef = asString(request.nextUrl.searchParams.get("project"));
    if (!projectRef) {
      return NextResponse.json({ ok: false, error: "project is required." }, { status: 400 });
    }

    const project = await getProjectMapping({ workspaceId, ref: projectRef });
    const readiness = await getSemrushReadiness({ workspaceId, projectSlug: project.projectSlug });

    return NextResponse.json({
      ok: true,
      project: { id: project.projectId, slug: project.projectSlug, label: project.projectLabel },
      mapping: readiness.mapping,
      suggestion: {
        // Derived from the mapped GSC property; must be confirmed via POST.
        domain: normalizeSemrushDomain(project.gscSiteUrl),
        databaseCode: SEMRUSH_DEFAULT_DATABASE,
      },
      readiness: {
        keyState: readiness.keyState,
        connected: readiness.connected,
        mapped: readiness.mapped,
        storageReady: readiness.storageReady,
        syncable: readiness.syncable,
        blockers: readiness.blockers,
        nextAction: readiness.nextAction,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to read SEMrush mapping." },
      { status: 500 },
    );
  }
}

/** POST { project, domain, databaseCode? } */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "Missing workspaceId on session." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const projectRef = asString(body.project);
    const domain = normalizeSemrushDomain(asString(body.domain));
    const databaseCode = normalizeSemrushDatabase(asString(body.databaseCode));

    if (!projectRef) {
      return NextResponse.json({ ok: false, error: "project is required." }, { status: 400 });
    }
    if (!domain) {
      return NextResponse.json({ ok: false, error: "A valid domain is required (e.g. example.com)." }, { status: 400 });
    }
    if (!databaseCode) {
      return NextResponse.json({ ok: false, error: "Invalid SEMrush database code (e.g. us, uk, in)." }, { status: 400 });
    }

    const project = await getProjectMapping({ workspaceId, ref: projectRef });

    const mapping = await recordSemrushDomainMapping({
      workspaceId,
      projectSlug: project.projectSlug,
      projectLabel: project.projectLabel,
      domain,
      databaseCode,
    });

    return NextResponse.json({ ok: true, mapping });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save SEMrush mapping." },
      { status: 500 },
    );
  }
}
