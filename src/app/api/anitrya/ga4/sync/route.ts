import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/token";

type Ga4Value = {
  value?: string;
};

type Ga4Row = {
  dimensionValues?: Ga4Value[];
  metricValues?: Ga4Value[];
};

type Ga4RunReportResponse = {
  rows?: Ga4Row[];
  rowCount?: number;
  metadata?: Record<string, unknown>;
  propertyQuota?: Record<string, unknown>;
};

function toDateOnlyFromGA4(value: string) {
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export async function POST() {
  try {
    const { workspace } = await requireAuth();

    const existingRun = await prisma.syncRun.findFirst({
      where: {
        workspaceId: workspace.id,
        source: "GOOGLE_GA4",
        status: "RUNNING"
      },
      orderBy: { startedAt: "desc" }
    });

    if (existingRun) {
      return NextResponse.json(
        { error: "SYNC_ALREADY_RUNNING" },
        { status: 400 }
      );
    }

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

    const properties = await prisma.ga4Property.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { propertyName: "asc" }
    });

    if (properties.length === 0) {
      return NextResponse.json(
        { error: "NO_GA4_PROPERTIES" },
        { status: 400 }
      );
    }

    const run = await prisma.syncRun.create({
      data: {
        workspaceId: workspace.id,
        source: "GOOGLE_GA4",
        status: "RUNNING",
        rowsSynced: 0,
        metadata: {
          propertiesRequested: properties.length,
          range: "28d",
          dimension: "date",
          metrics: [
            "activeUsers",
            "sessions",
            "engagedSessions",
            "engagementRate"
          ],
          keepEmptyRows: true,
          endDate: "yesterday"
        }
      }
    });

    let rowsSynced = 0;
    let propertiesProcessed = 0;
    let propertiesWithNoRows = 0;

    const perPropertySummary: Array<{
      propertyId: string;
      propertyName: string;
      rowsReturned: number;
      firstDate: string | null;
      lastDate: string | null;
    }> = [];

    for (const property of properties) {
      const propertyId = property.propertyName.replace("properties/", "");

      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "activeUsers" },
              { name: "sessions" },
              { name: "engagedSessions" },
              { name: "engagementRate" }
            ],
            keepEmptyRows: true,
            limit: 10000,
            orderBys: [
              {
                dimension: { dimensionName: "date" }
              }
            ],
            returnPropertyQuota: true
          })
        }
      );

      const json = (await res.json()) as Ga4RunReportResponse | { error?: unknown };

      if (!res.ok) {
        await prisma.syncRun.update({
          where: { id: run.id },
          data: {
            status: "ERROR",
            error: JSON.stringify(json),
            endedAt: new Date(),
            rowsSynced,
            metadata: {
              propertiesRequested: properties.length,
              propertiesProcessed,
              propertiesWithNoRows,
              failedProperty: property.propertyName
            }
          }
        });

        return NextResponse.json(
          { error: "GA4_SYNC_FAILED", detail: json },
          { status: 500 }
        );
      }

      const rows = (json as Ga4RunReportResponse).rows ?? [];
      propertiesProcessed += 1;

      if (rows.length === 0) {
        propertiesWithNoRows += 1;
      }

      let firstDate: string | null = null;
      let lastDate: string | null = null;

      for (const row of rows) {
        const dateValue = row.dimensionValues?.[0]?.value;
        if (!dateValue) continue;

        if (!firstDate) firstDate = dateValue;
        lastDate = dateValue;

        const metrics = row.metricValues ?? [];

        await prisma.ga4DailyMetric.upsert({
          where: {
            propertyId_date: {
              propertyId: property.id,
              date: toDateOnlyFromGA4(dateValue)
            }
          },
          update: {
            users: Number(metrics[0]?.value ?? 0),
            sessions: Number(metrics[1]?.value ?? 0),
            engagedSessions: Number(metrics[2]?.value ?? 0),
            engagementRate: Number(metrics[3]?.value ?? 0)
          },
          create: {
            workspaceId: workspace.id,
            propertyId: property.id,
            date: toDateOnlyFromGA4(dateValue),
            users: Number(metrics[0]?.value ?? 0),
            sessions: Number(metrics[1]?.value ?? 0),
            engagedSessions: Number(metrics[2]?.value ?? 0),
            engagementRate: Number(metrics[3]?.value ?? 0)
          }
        });

        rowsSynced += 1;
      }

      perPropertySummary.push({
        propertyId,
        propertyName: property.displayName ?? property.propertyName,
        rowsReturned: rows.length,
        firstDate,
        lastDate
      });
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        rowsSynced,
        endedAt: new Date(),
        metadata: {
          propertiesRequested: properties.length,
          propertiesProcessed,
          propertiesWithNoRows,
          range: "28d",
          dimension: "date",
          metrics: [
            "activeUsers",
            "sessions",
            "engagedSessions",
            "engagementRate"
          ],
          keepEmptyRows: true,
          endDate: "yesterday",
          perPropertySummary
        }
      }
    });

    return NextResponse.json({
      ok: true,
      rowsSynced,
      propertiesProcessed,
      propertiesWithNoRows,
      perPropertySummary
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}