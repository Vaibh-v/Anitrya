import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, audit } from "@/lib/org/access";
import { deleteOrganizationData } from "@/lib/org/delete-data";

/** Owner only. Body: { confirm: "<organization name>" }. Permanent. */
export async function POST(request: Request) {
  const access = await getAccess();
  if (!access) return NextResponse.json({ ok: false }, { status: 401 });
  if (access.role !== "OWNER") return NextResponse.json({ ok: false, error: "Only the organization owner can delete its data." }, { status: 403 });
  const workspace = await prisma.workspace.findUnique({ where: { id: access.workspaceId }, select: { name: true } });
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (!workspace || body.confirm?.trim() !== workspace.name.trim()) {
    return NextResponse.json({ ok: false, error: `Type the organization name (“${workspace?.name ?? ""}”) to confirm.` }, { status: 400 });
  }
  const removed = await deleteOrganizationData(access.workspaceId);
  await audit(access, "org.data_deleted", removed);
  return NextResponse.json({ ok: true, removed });
}
