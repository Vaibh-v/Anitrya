import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getExecutionStates,
  upsertExecutionState,
} from "@/lib/intelligence/execution-state-store";

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);

  const projectId =
    searchParams.get("project") ||
    session.user?.workspaceId ||
    "default-project";

  return NextResponse.json({
    ok: true,
    records: getExecutionStates(projectId),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  const projectId =
    body.projectId ||
    session.user?.workspaceId ||
    "default-project";

  const record = upsertExecutionState({
    projectId,
    actionTitle: body.actionTitle,
    status: body.status,
  });

  return NextResponse.json({
    ok: true,
    record,
  });
}