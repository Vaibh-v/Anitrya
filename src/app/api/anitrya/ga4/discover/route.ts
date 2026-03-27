import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/token";

type AccountSummaryProperty = {
  property?: string;
  displayName?: string;
};

type AccountSummary = {
  account?: string;
  displayName?: string;
  propertySummaries?: AccountSummaryProperty[];
};

type AccountSummariesResponse = {
  accountSummaries?: AccountSummary[];
  nextPageToken?: string;
};

export async function POST() {
  try {
    const { workspace } = await requireAuth();

    const accessToken = await getValidAccessToken({
      workspaceId: workspace.id,
      provider: "GOOGLE_GA4"
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: "GA4_NOT_CONNECTED" },
        { status: 400 }
      );
    }

    let total = 0;
    let nextPageToken: string | undefined;

    do {
      const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
      if (nextPageToken) {
        url.searchParams.set("pageToken", nextPageToken);
      }
      url.searchParams.set("pageSize", "200");

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const json = (await res.json()) as AccountSummariesResponse;

      if (!res.ok) {
        return NextResponse.json(
          {
            error: "GA4_DISCOVERY_FAILED",
            detail: JSON.stringify(json)
          },
          { status: 500 }
        );
      }

      const summaries = json.accountSummaries ?? [];

      for (const summary of summaries) {
        const properties = summary.propertySummaries ?? [];

        for (const property of properties) {
          if (!property.property) continue;

          await prisma.ga4Property.upsert({
            where: {
              workspaceId_propertyName: {
                workspaceId: workspace.id,
                propertyName: property.property
              }
            },
            update: {
              displayName: property.displayName ?? null,
              accountName: summary.displayName ?? null
            },
            create: {
              workspaceId: workspace.id,
              propertyName: property.property,
              displayName: property.displayName ?? null,
              accountName: summary.displayName ?? null
            }
          });

          total += 1;
        }
      }

      nextPageToken = json.nextPageToken;
    } while (nextPageToken);

    return NextResponse.json({
      ok: true,
      discovered: total
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}