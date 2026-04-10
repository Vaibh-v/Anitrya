import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    const body = await req.json();

    const project = await prisma.project.findFirst({
      where: {
        workspaceId,
        OR: [
          { id: body.project },
          { slug: body.project },
          { name: body.project },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const ga = await prisma.ga4Property.findFirst({
      where: { id: body.ga4PropertyId, workspaceId },
    });

    const gsc = await prisma.gscSite.findFirst({
      where: { id: body.gscSiteId, workspaceId },
    });

    if (!ga) {
      return NextResponse.json(
        { error: "GA4 property not in workspace" },
        { status: 400 },
      );
    }

    if (!gsc) {
      return NextResponse.json(
        { error: "GSC site not in workspace" },
        { status: 400 },
      );
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        ga4PropertyId: ga.id,
        gscSiteId: gsc.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}