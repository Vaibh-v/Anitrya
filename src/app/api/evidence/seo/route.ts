import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getSeoEvidenceSummary } from "@/lib/evidence/normalized-seo-store";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const workspaceId = session.user?.workspaceId;
    const projectId = searchParams.get("project");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspace context." }, { status: 401 });
    }

    if (!projectId || !from || !to) {
      return NextResponse.json(
        { error: "project, from, and to are required." },
        { status: 400 }
      );
    }

    const summary = await getSeoEvidenceSummary({
      workspaceId,
      projectId,
      from,
      to,
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load SEO evidence." },
      { status: error?.status ?? 500 }
    );
  }
}