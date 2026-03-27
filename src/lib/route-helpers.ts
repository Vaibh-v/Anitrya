import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("UNAUTHENTICATED");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const workspace = await ensureWorkspaceForUser({
    userId: user.id,
    email: user.email
  });

  return { session, user, workspace };
}