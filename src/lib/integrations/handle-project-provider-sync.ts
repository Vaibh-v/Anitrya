import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import type { IntegrationSyncProvider } from "@/lib/integrations/sync-contracts";
import { parseProjectSyncRequest } from "@/lib/integrations/project-sync-request";
import { runProjectIntegrationSyncs } from "@/lib/integrations/run-project-integration-syncs";

export async function handleProjectProviderSync(
  request: NextRequest,
  provider: IntegrationSyncProvider,
) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "No active workspace found for this session." },
        { status: 401 },
      );
    }

    const input = parseProjectSyncRequest(await request.json().catch(() => null));

    if (!input) {
      return NextResponse.json(
        { ok: false, error: "project, from, and to are required; dates must be valid YYYY-MM-DD values with from <= to." },
        { status: 400 },
      );
    }

    const mapping = await getProjectMapping({
      workspaceId,
      ref: input.project,
    });

    const [result] = await runProjectIntegrationSyncs(
      { workspaceId, mapping, from: input.from, to: input.to },
      provider,
    );

    if (!result) {
      throw new Error(`No sync runner registered for ${provider}.`);
    }

    return NextResponse.json(
      {
        ok: result.status === "success",
        project: {
          id: mapping.projectId,
          slug: mapping.projectSlug,
          label: mapping.projectLabel,
        },
        result,
      },
      { status: result.status === "success" ? 200 : result.status === "skipped" ? 409 : 502 },
    );
  } catch (error) {
    const status =
      error instanceof Error && "status" in error && error.status === 401
        ? 401
        : error instanceof Error && error.message === "Project not found."
          ? 404
          : 500;

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Provider sync failed." },
      { status },
    );
  }
}
