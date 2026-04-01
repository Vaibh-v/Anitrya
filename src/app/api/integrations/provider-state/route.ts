import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProviderStateSummaryCards } from "@/lib/integrations/provider-state-summary";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const tokens = await prisma.integrationToken.findMany({
      where: {
        workspaceId,
      },
      select: {
        provider: true,
        scope: true,
        expiresAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const summaryCards = buildProviderStateSummaryCards(tokens);

    return NextResponse.json({
      ok: true,
      workspaceId,
      summaryCards,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load provider state.",
      },
      { status: error?.status ?? 500 }
    );
  }
}