import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildProjectIntegrationHealth } from "@/lib/integrations/project-integration-health";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId ?? null;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project") ?? "default-project";

    const health = await buildProjectIntegrationHealth({
      workspaceId,
      projectId,
    });

    return NextResponse.json({
      ok: true,
      health,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to compute project integration health.",
      },
      { status: error?.status ?? 500 }
    );
  }
}