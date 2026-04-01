import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  insertRecommendationOutcome,
  listRecommendationOutcomes,
} from "@/lib/intelligence/outcome-store";

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const workspaceId = session.user?.workspaceId;
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const projectSlug = asNonEmptyString(searchParams.get("project"));
    const hypothesisTitle = asNonEmptyString(searchParams.get("hypothesisTitle"));
    const limit = asNumber(searchParams.get("limit")) || 100;

    const outcomes = await listRecommendationOutcomes({
      workspaceId,
      projectSlug: projectSlug || undefined,
      hypothesisTitle: hypothesisTitle || undefined,
      limit,
    });

    return NextResponse.json({
      ok: true,
      outcomes: outcomes.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        projectSlug: row.project_slug,
        hypothesisTitle: row.hypothesis_title,
        recommendationTitle: row.recommendation_title,
        outcomeStatus: row.outcome_status,
        outcomeNote: row.outcome_note,
        impactDelta: row.impact_delta,
        createdAt: row.created_at.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load recommendation outcomes.",
      },
      { status: error?.status ?? 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspaceId on session." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const projectSlug = asNonEmptyString(body?.projectSlug);
    const hypothesisTitle = asNonEmptyString(body?.hypothesisTitle);
    const recommendationTitle = asNonEmptyString(body?.recommendationTitle);
    const outcomeStatus = asNonEmptyString(body?.outcomeStatus) as
      | "accepted"
      | "rejected"
      | "implemented"
      | "improved"
      | "no_impact";
    const outcomeNote = asNonEmptyString(body?.outcomeNote);
    const impactDelta = asNumber(body?.impactDelta);

    if (!projectSlug) {
      return NextResponse.json(
        { ok: false, error: "projectSlug is required." },
        { status: 400 }
      );
    }

    if (!hypothesisTitle) {
      return NextResponse.json(
        { ok: false, error: "hypothesisTitle is required." },
        { status: 400 }
      );
    }

    if (!recommendationTitle) {
      return NextResponse.json(
        { ok: false, error: "recommendationTitle is required." },
        { status: 400 }
      );
    }

    if (
      !["accepted", "rejected", "implemented", "improved", "no_impact"].includes(
        outcomeStatus
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid outcomeStatus." },
        { status: 400 }
      );
    }

    await insertRecommendationOutcome({
      workspaceId,
      projectSlug,
      hypothesisTitle,
      recommendationTitle,
      outcomeStatus,
      outcomeNote,
      impactDelta,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to record recommendation outcome.",
      },
      { status: error?.status ?? 500 }
    );
  }
}