import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { runIntelligence } from "@/lib/intelligence/run-intelligence";
import { exportIntelligenceToSheets } from "@/lib/intelligence/owner-network/export-intelligence-to-sheets";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = asString(session.user?.workspaceId);

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "No active workspace found for this session." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);

    const projectRef =
      asString(body?.project) ??
      asString(body?.projectSlug) ??
      asString(body?.projectId);
    const from = asString(body?.from);
    const to = asString(body?.to);

    if (!projectRef || !from || !to) {
      return NextResponse.json(
        { ok: false, error: "project, from, and to are required." },
        { status: 400 },
      );
    }

    const mapping = await getProjectMapping({
      workspaceId,
      ref: projectRef,
    });

    const result = await runIntelligence({
      workspaceId: mapping.workspaceId,
      projectId: mapping.projectId,
      projectSlug: mapping.projectSlug,
      projectLabel: mapping.projectLabel,
      from,
      to,
    });

    const exportResult = await exportIntelligenceToSheets({
      run: {
        workspaceId: mapping.workspaceId,
        projectId: mapping.projectId,
        projectSlug: mapping.projectSlug,
        projectLabel: mapping.projectLabel,
        from,
        to,
      },
      output: result,
    });

    return NextResponse.json({
      ok: true,
      project: {
        id: mapping.projectId,
        slug: mapping.projectSlug,
        label: mapping.projectLabel,
      },
      result,
      exportResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Intelligence run failed.",
      },
      { status: 500 },
    );
  }
}