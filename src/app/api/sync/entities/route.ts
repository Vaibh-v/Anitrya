import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/intelligence/date-range";
import { loadProjectData } from "@/lib/intelligence/repository";
import { getProjectDiagnostics } from "@/lib/project-diagnostics";
import { syncProjectEntityEvidence } from "@/lib/intelligence/entity-sync";
import { getValidWorkspaceGoogleAccessToken } from "@/lib/google/oauth-refresh";
import { buildOwnerMemoryRows } from "@/lib/intelligence/memory-records";
import { persistOwnerMemory } from "@/lib/intelligence/owner-sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
  projectId?: unknown;
  from?: unknown;
  to?: unknown;
};

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? (value as LooseRecord) : {};
}

function pickArray<T = unknown>(source: LooseRecord, keys: string[]): T[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function differenceInDaysInclusive(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    const from = isIsoDate(body.from) ? body.from : null;
    const to = isIsoDate(body.to) ? body.to : null;

    if (!projectId || !from || !to) {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_INPUT",
          message: "projectId, from, and to must be valid YYYY-MM-DD values.",
          source: "ENTITY_SYNC_ROUTE",
        },
        400
      );
    }

    const days = differenceInDaysInclusive(from, to);

    if (days < 1) {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_DATE_RANGE",
          message: "From date must be earlier than or equal to To date.",
          source: "ENTITY_SYNC_ROUTE",
        },
        400
      );
    }

    if (days > 7) {
      return jsonResponse(
        {
          success: false,
          error: "RANGE_TOO_LARGE",
          message: "Entity sync route accepts a maximum 7-day window per request.",
          source: "ENTITY_SYNC_ROUTE",
        },
        400
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return jsonResponse(
        {
          success: false,
          error: "PROJECT_NOT_FOUND",
          message: "Project not found.",
          source: "ENTITY_SYNC_ROUTE",
        },
        404
      );
    }

    const accessToken = await getValidWorkspaceGoogleAccessToken({
      workspaceId: project.workspaceId,
    });

    const result = await syncProjectEntityEvidence({
      projectId,
      session: { accessToken },
      from,
      to,
    });

    let ownerMemory:
      | {
          ok: true;
          insightsWritten: number;
          recommendationsWritten: number;
        }
      | {
          ok: false;
          skipped?: boolean;
          message: string;
        } = {
      ok: false,
      skipped: true,
      message: "Owner memory export not configured.",
    };

    const ownerSheetId = process.env.OWNER_MEMORY_SHEET_ID;

    if (ownerSheetId && project.slug) {
      try {
        const dateRange = resolveDateRange({
          preset: "custom",
          from,
          to,
        });

        const bundleInput = await loadProjectData({
          workspaceId: project.workspaceId,
          projectSlug: project.slug,
          dateRange,
        });

        const bundle = asRecord(bundleInput);

        const diagnostics = getProjectDiagnostics({
          overviewTable: pickArray(bundle, ["overviewTable"]),
          seoTable: pickArray(bundle, ["seoTable"]),
          behaviorTable: pickArray(bundle, ["behaviorTable"]),
          gscQueryRows: pickArray(bundle, ["gscQueries", "gscQueryRows"]),
          gscPageRows: pickArray(bundle, ["gscPages", "gscPageRows"]),
          ga4LandingRows: pickArray(bundle, ["ga4Landings", "ga4LandingPages", "ga4LandingRows"]),
          ga4SourceRows: pickArray(bundle, ["ga4Sources", "ga4SourceRows"]),
        } as never);

        const rows = buildOwnerMemoryRows({
          workspaceId: project.workspaceId,
          diagnostics,
        });

        const persisted = await persistOwnerMemory({
          spreadsheetId: ownerSheetId,
          insights: rows.insights,
          recommendations: rows.recommendations,
        });

        ownerMemory = {
          ok: true,
          insightsWritten: persisted.insightsWritten,
          recommendationsWritten: persisted.recommendationsWritten,
        };
      } catch (error) {
        ownerMemory = {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Owner memory export failed after sync.",
        };
      }
    }

    return jsonResponse(
      {
        success: true,
        data: result,
        ownerMemory,
      },
      200
    );
  } catch (error) {
    console.error("ENTITY_SYNC_ROUTE_FATAL", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return jsonResponse(
      {
        success: false,
        error: "ENTITY_SYNC_FAILED",
        message,
        source: "ENTITY_SYNC_ROUTE",
      },
      500
    );
  }
}