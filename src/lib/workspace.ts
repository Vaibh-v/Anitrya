import { prisma } from "@/lib/prisma";

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