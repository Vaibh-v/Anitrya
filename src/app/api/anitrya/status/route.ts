import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { user, workspace } = await requireAuth();

    const [gscToken, ga4Token, gscSites, ga4Properties] = await Promise.all([
      prisma.integrationToken.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: "GOOGLE_GSC"
          }
        }
      }),
      prisma.integrationToken.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: "GOOGLE_GA4"
          }
        }
      }),
      prisma.gscSite.count({ where: { workspaceId: workspace.id } }),
      prisma.ga4Property.count({ where: { workspaceId: workspace.id } })
    ]);

    return NextResponse.json({
      ok: true,
      userEmail: user.email,
      workspaceId: workspace.id,
      connected: {
        gsc: !!gscToken,
        ga4: !!ga4Token
      },
      discovered: {
        gscSites,
        ga4Properties
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { ok: false, error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}