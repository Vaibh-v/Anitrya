import { prisma } from "@/lib/prisma";

export async function getWorkspaceProviderTokenSnapshot(workspaceId: string) {
  return prisma.integrationToken.findMany({
    where: { workspaceId },
    select: {
      provider: true,
      updatedAt: true,
      expiresAt: true,
      scope: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}