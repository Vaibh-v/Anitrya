import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);

    const projectRef = asOptionalString(body?.project);
    const ga4PropertyId = asOptionalString(body?.ga4PropertyId);
    const gscSiteId = asOptionalString(body?.gscSiteId);

    if (!projectRef) {
      return NextResponse.json(
        { error: "project is required." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectRef }, { slug: projectRef }, { name: projectRef }],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        ga4PropertyId,
        gscSiteId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        ga4PropertyId: true,
        gscSiteId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      project: updated,
      message: "Project mapping saved. Run entity sync again for this project.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update mapping.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}