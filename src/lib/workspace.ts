import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/org/members";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function ensureWorkspaceForUser(params: {
  userId: string;
  email: string;
}) {
  // The organization the user last switched to (or joined by invite) wins,
  // as long as they are still a member of it.
  const active = await getActiveWorkspace(params.userId);
  if (active) {
    const activeMembership = await prisma.membership.findFirst({
      where: { userId: params.userId, workspaceId: active },
      include: { workspace: true },
    });
    if (activeMembership) return activeMembership.workspace;
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: params.userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const base = slugify(params.email.split("@")[0] || "workspace");
  const workspace = await prisma.workspace.create({
    data: {
      name: "Default Workspace",
      slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
      memberships: {
        create: {
          userId: params.userId,
          role: "ADMIN"
        }
      }
    }
  });

  return workspace;
}