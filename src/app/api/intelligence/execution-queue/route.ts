import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildExecutionQueue } from "@/lib/intelligence/execution-queue-builder";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project") || workspaceId;

    const queue = await buildExecutionQueue(projectId, workspaceId);

    return NextResponse.json({
      ok: true,
      queue,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to build execution queue.",
      },
      { status: error?.status ?? 500 }
    );
  }
}