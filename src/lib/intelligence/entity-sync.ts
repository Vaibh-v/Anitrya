import { prisma } from "@/lib/prisma";
import {
  gaLandingPageRows,
  gaSourceMediumRows,
  getAccessToken,
  gscQueryPageRows,
} from "@/lib/google";
import {
  collapseGscPageRows,
  normalizeGa4LandingRows,
  normalizeGa4SourceRows,
  normalizeGscQueryRows,
} from "@/lib/intelligence/entity-normalizers";
import {
  replaceGa4EntityMetrics,
  replaceGscEntityMetrics,
} from "@/lib/intelligence/entity-upserts";

type SessionLike = {
  accessToken?: string | null;
  user?: {
    email?: string | null;
  } | null;
};

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  );

  while (cursor.getTime() <= last.getTime()) {
    out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

export async function syncProjectEntityEvidence(input: {
  projectId: string;
  session: SessionLike;
  from: string;
  to: string;
}) {
  console.log("ENTITY_SYNC_START", {
    projectId: input.projectId,
    from: input.from,
    to: input.to,
  });

  const token = getAccessToken(input.session as any);

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: {
      gscSite: true,
      ga4Property: true,
      workspace: true,
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const start = new Date(`${input.from}T00:00:00.000Z`);
  const end = new Date(`${input.to}T00:00:00.000Z`);
  const dates = daysBetweenInclusive(start, end);

  let gscDatesProcessed = 0;
  let ga4DatesProcessed = 0;

  for (const date of dates) {
    const dateString = isoDate(date);

    if (project.gscSite) {
      try {
        const keywordRows = await gscQueryPageRows(token, {
          siteUrl: project.gscSite.siteUrl,
          startDate: dateString,
          endDate: dateString,
          rowLimit: 1000,
        });

        const normalizedQueryRows = normalizeGscQueryRows({
          workspaceId: project.workspaceId,
          siteId: project.gscSite.id,
          date,
          rows: keywordRows,
        });

        const normalizedPageRows = collapseGscPageRows({
          workspaceId: project.workspaceId,
          siteId: project.gscSite.id,
          date,
          rows: normalizedQueryRows.map((row) => ({
            page: row.page,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          })),
        });

        await replaceGscEntityMetrics({
          siteId: project.gscSite.id,
          date,
          queryRows: normalizedQueryRows,
          pageRows: normalizedPageRows,
        });

        gscDatesProcessed += 1;
      } catch (error) {
        console.error("ENTITY_SYNC_GSC_ERROR", {
          date: dateString,
          projectId: project.id,
          error,
        });

        const message =
          error instanceof Error ? error.message : "Unknown GSC sync error";

        throw new Error(`GSC entity sync failed for ${dateString}: ${message}`);
      }
    }

    if (project.ga4Property) {
      try {
        const [landingRowsRaw, sourceRowsRaw] = await Promise.all([
          gaLandingPageRows(token, project.ga4Property.propertyName, {
            startDate: dateString,
            endDate: dateString,
            limit: 1000,
          }),
          gaSourceMediumRows(token, project.ga4Property.propertyName, {
            startDate: dateString,
            endDate: dateString,
            limit: 250,
          }),
        ]);

        const landingRows = normalizeGa4LandingRows({
          workspaceId: project.workspaceId,
          propertyId: project.ga4Property.id,
          date,
          rows: landingRowsRaw,
        });

        const sourceRows = normalizeGa4SourceRows({
          workspaceId: project.workspaceId,
          propertyId: project.ga4Property.id,
          date,
          rows: sourceRowsRaw,
        });

        await replaceGa4EntityMetrics({
          propertyId: project.ga4Property.id,
          date,
          landingRows,
          sourceRows,
        });

        ga4DatesProcessed += 1;
      } catch (error) {
        console.error("ENTITY_SYNC_GA4_ERROR", {
          date: dateString,
          projectId: project.id,
          propertyName: project.ga4Property.propertyName,
          error,
        });

        const message =
          error instanceof Error ? error.message : "Unknown GA4 sync error";

        throw new Error(`GA4 entity sync failed for ${dateString}: ${message}`);
      }
    }
  }

  const result = {
    ok: true,
    projectId: project.id,
    from: input.from,
    to: input.to,
    datesProcessed: dates.length,
    gscDatesProcessed,
    ga4DatesProcessed,
  };

  console.log("ENTITY_SYNC_RESULT", result);

  return result;
}