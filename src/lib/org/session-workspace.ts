import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** The signed-in user's active workspace, or null. Never trust a workspace id from the request. */
export async function sessionWorkspaceId(): Promise<string | null> {
  const session = await getServerSession(authOptions).catch(() => null);
  return session?.user?.workspaceId ?? null;
}
