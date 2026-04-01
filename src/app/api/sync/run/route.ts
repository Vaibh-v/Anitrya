import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { resolveSelectedProject } from "@/lib/projects/resolve-selected-project";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));

    const requestedProjectId =
      typeof body?.projectId === "string" ? body.projectId : "";

    const selectedProject = resolveSelectedProject({
      requestedProjectId,
      sessionWorkspaceId: session.user?.workspaceId ?? null,
      fallbackProjectId: "default-project",
    });

    if (!selectedProject.hasProject) {
      return NextResponse.json(
        {
          ok: false,
          error: "No project selected for sync.",
        },
        { status: 400 }
      );
    }

    const ranAt = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      ranAt,
      note: `Sync queued for ${selectedProject.displayName}.`,
      projectId: selectedProject.projectId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Sync failed.",
      },
      { status: error?.status ?? 500 }
    );
  }
}