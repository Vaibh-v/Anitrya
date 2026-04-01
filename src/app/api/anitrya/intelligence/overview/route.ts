import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { getProjectIntelligence } from "@/lib/intelligence";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await requireAuth();
    const project = request.nextUrl.searchParams.get("project");

    const intelligence = await getProjectIntelligence(workspace.id, project);

    if (!intelligence) {
      return NextResponse.json(
        { error: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(intelligence);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}