import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { getWorkspaceIntelligence } from "@/lib/intelligence";

export async function GET() {
  try {
    const { workspace } = await requireAuth();
    const intelligence = await getWorkspaceIntelligence(workspace.id);

    return NextResponse.json(intelligence);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}