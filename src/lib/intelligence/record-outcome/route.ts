import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { insertRecommendationOutcome } from "@/lib/intelligence/outcome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
  projectId?: unknown;
  hypothesisTitle?: unknown;
  recommendationTitle?: unknown;
  outcomeStatus?: unknown;
  outcomeNote?: unknown;
  impactDelta?: unknown;
};

function json(payload: Record<string, unknown>, status = 200) {
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
    const hypothesisTitle =
      typeof body.hypothesisTitle === "string" ? body.hypothesisTitle.trim() : "";
    const recommendationTitle =
      typeof body.recommendationTitle === "string"
        ? body.recommendationTitle.trim()
        : "";
    const outcomeStatus =
      typeof body.outcomeStatus === "string" ? body.outcomeStatus.trim() : "";
    const outcomeNote =
      typeof body.outcomeNote === "string" ? body.outcomeNote.trim() : "";
    const impactDelta =
      typeof body.impactDelta === "number"
        ? body.impactDelta
        : Number(body.impactDelta ?? 0);

    if (!projectId || !hypothesisTitle || !recommendationTitle || !outcomeStatus) {
      return json(
        {
          ok: false,
          error: "INVALID_INPUT",
          message:
            "projectId, hypothesisTitle, recommendationTitle, and outcomeStatus are required.",
        },
        400
      );
    }

    const allowed = new Set([
      "accepted",
      "rejected",
      "implemented",
      "improved",
      "no_impact",
    ]);

    if (!allowed.has(outcomeStatus)) {
      return json(
        {
          ok: false,
          error: "INVALID_OUTCOME_STATUS",
          message:
            "outcomeStatus must be one of accepted, rejected, implemented, improved, no_impact.",
        },
        400
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.slug) {
      return json(
        {
          ok: false,
          error: "PROJECT_NOT_FOUND",
          message: "Project not found or missing slug.",
        },
        404
      );
    }

    await insertRecommendationOutcome({
      workspaceId: project.workspaceId,
      projectSlug: project.slug,
      hypothesisTitle,
      recommendationTitle,
      outcomeStatus: outcomeStatus as
        | "accepted"
        | "rejected"
        | "implemented"
        | "improved"
        | "no_impact",
      outcomeNote,
      impactDelta: Number.isFinite(impactDelta) ? impactDelta : 0,
    });

    return json({
      ok: true,
      projectId: project.id,
      projectSlug: project.slug,
      hypothesisTitle,
      recommendationTitle,
      outcomeStatus,
    });
  } catch (error) {
    console.error("RECORD_OUTCOME_FAILED", error);

    return json(
      {
        ok: false,
        error: "RECORD_OUTCOME_FAILED",
        message:
          error instanceof Error ? error.message : "Unknown outcome recording error.",
      },
      500
    );
  }
}