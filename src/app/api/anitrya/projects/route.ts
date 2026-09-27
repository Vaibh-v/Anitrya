import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { createWorkspaceProject } from "@/lib/projects";
import { audit, getAccess, requirePermission } from "@/lib/org/access";

export async function GET() {
  try {
    const { workspace } = await requireAuth();

    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id },
      include: {
        ga4Property: true,
        gscSite: true
      },
      orderBy: { name: "asc" }
    });

    // Members limited to certain projects only see those.
    const access = await getAccess();
    const visible = access?.projectScope ? projects.filter((p) => access.projectScope!.includes(p.slug)) : projects;

    return NextResponse.json({
      ok: true,
      projects: visible
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("manage_projects");
  if (guard instanceof NextResponse) return guard;
  const existingCount = await prisma.project.count({ where: { workspaceId: guard.workspaceId } });
  if (existingCount >= guard.limits.projects) {
    return NextResponse.json({ ok: false, error: `Your ${guard.limits.label} plan includes ${guard.limits.projects} projects.` }, { status: 403 });
  }
  try {
    const { workspace } = await requireAuth();
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const ga4PropertyId =
      typeof body.ga4PropertyId === "string" && body.ga4PropertyId.length > 0
        ? body.ga4PropertyId
        : null;

    const gscSiteId =
      typeof body.gscSiteId === "string" && body.gscSiteId.length > 0
        ? body.gscSiteId
        : null;

    if (!name) {
      return NextResponse.json({ error: "PROJECT_NAME_REQUIRED" }, { status: 400 });
    }

    const project = await createWorkspaceProject({
      workspaceId: workspace.id,
      name,
      ga4PropertyId,
      gscSiteId
    });

    await audit(guard, "project.created", { name, slug: project.slug });

    return NextResponse.json({
      ok: true,
      project
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}