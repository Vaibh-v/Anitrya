import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { createWorkspaceProject } from "@/lib/projects";

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

    return NextResponse.json({
      ok: true,
      projects
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