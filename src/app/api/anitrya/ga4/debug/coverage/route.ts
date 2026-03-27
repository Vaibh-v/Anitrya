import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { workspace } = await requireAuth();

  const properties = await prisma.ga4Property.findMany({
    where: { workspaceId: workspace.id }
  });

  const result = [];

  for (const property of properties) {
    const rows = await prisma.ga4DailyMetric.findMany({
      where: { propertyId: property.id },
      orderBy: { date: "asc" }
    });

    result.push({
      property: property.displayName,
      totalRows: rows.length,
      firstDate: rows[0]?.date ?? null,
      lastDate: rows[rows.length - 1]?.date ?? null
    });
  }

  return NextResponse.json(result);
}