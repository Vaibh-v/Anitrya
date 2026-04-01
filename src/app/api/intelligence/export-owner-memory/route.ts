import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { loadProjectData } from "@/lib/intelligence/repository";
import { getProjectDiagnostics } from "@/lib/project-diagnostics";
import { buildOwnerMemoryRows } from "@/lib/intelligence/memory-records";
import { persistOwnerMemory } from "@/lib/intelligence/owner-sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
  projectId?: unknown;
  preset?: unknown;
  from?: unknown;
  to?: unknown;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  try {
    const ownerSheetId = process.env.OWNER_MEMORY_SHEET_ID;

    if (!ownerSheetId) {
      return json(
        {
          ok: false,
          error: "OWNER_MEMORY_SHEET_ID_MISSING",
          message: "Set OWNER_MEMORY_SHEET_ID in environment variables.",
        },
        500
      );
    }

    const body = (await req.json()) as RequestBody;
    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";

    if (!projectId) {
      return json(
        {
          ok: false,
          error: "PROJECT_ID_REQUIRED",
          message: "projectId is required.",
        },
        400
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return json(
        {
          ok: false,
          error: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
        404
      );
    }

    const dateRange = resolveDateRange({
      preset: typeof body.preset === "string" ? body.preset : undefined,
      from: typeof body.from === "string" ? body.from : undefined,
      to: typeof body.to === "string" ? body.to : undefined,
    });

    const bundle = await loadProjectData({
      workspaceId: project.workspaceId,
      projectSlug: project.slug,
      dateRange,
    });

    const diagnostics = getProjectDiagnostics(bundle as any);
    const rows = buildOwnerMemoryRows({
      workspaceId: project.workspaceId,
      diagnostics,
    });

    const persisted = await persistOwnerMemory({
      spreadsheetId: ownerSheetId,
      insights: rows.insights,
      recommendations: rows.recommendations,
    });

    return json({
      ok: true,
      projectId: project.id,
      projectSlug: project.slug,
      range: dateRange,
      insightsWritten: persisted.insightsWritten,
      recommendationsWritten: persisted.recommendationsWritten,
    });
  } catch (error) {
    console.error("OWNER_MEMORY_EXPORT_FAILED", error);

    const message =
      error instanceof Error ? error.message : "Unknown export error.";

    return json(
      {
        ok: false,
        error: "OWNER_MEMORY_EXPORT_FAILED",
        message,
      },
      500
    );
  }
}