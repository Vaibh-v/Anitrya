import { NextRequest, NextResponse } from "next/server";
import { getSyncStatusSummary } from "@/lib/sync/sync-status-store";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim() ?? "";
  const projectSlug = request.nextUrl.searchParams.get("projectSlug")?.trim() ?? "";

  if (!workspaceId || !projectSlug) {
    return NextResponse.json(
      {
        error: "workspaceId and projectSlug are required.",
      },
      { status: 400 }
    );
  }

  const summary = await getSyncStatusSummary({
    workspaceId,
    projectSlug,
  });

  return NextResponse.json(summary);
}