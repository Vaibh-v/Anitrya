/**
 * How the founder's owner sheets are written.
 * 1. A service account, when GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL/_PRIVATE_KEY are set.
 * 2. Otherwise the founder's own Google sign-in (OAuth with the Sheets scope).
 * The founder workspace is ANITRYA_FOUNDER_WORKSPACE_ID, else the workspace of
 * ANITRYA_FOUNDER_EMAIL, else the oldest workspace (the founder signed up first).
 */
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getGoogleSheetsAccessTokenForWorkspace } from "@/lib/google/tokens";

export type OwnerSheetsAuthMode = "service_account" | "founder_oauth";

export function serviceAccountConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim() && process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim());
}

let founderWorkspace: Promise<string | null> | null = null;

export function resolveFounderWorkspaceId(): Promise<string | null> {
  if (!founderWorkspace) {
    founderWorkspace = (async () => {
      const explicit = process.env.ANITRYA_FOUNDER_WORKSPACE_ID?.trim();
      if (explicit) return explicit;
      const email = process.env.ANITRYA_FOUNDER_EMAIL?.trim().toLowerCase();
      if (email) {
        const membership = await prisma.membership.findFirst({
          where: { user: { email: { equals: email, mode: "insensitive" } } },
          orderBy: { createdAt: "asc" },
          select: { workspaceId: true },
        });
        if (membership) return membership.workspaceId;
      }
      const oldest = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
      return oldest?.id ?? null;
    })().catch((error) => {
      founderWorkspace = null;
      console.error("FOUNDER_WORKSPACE_LOOKUP_FAILED", error instanceof Error ? error.message : error);
      return null;
    });
  }
  return founderWorkspace;
}

/** Which way owner sheets can be written right now, or null if neither is available. */
export async function ownerSheetsAuthMode(): Promise<OwnerSheetsAuthMode | null> {
  if (serviceAccountConfigured()) return "service_account";
  const workspaceId = await resolveFounderWorkspaceId();
  if (!workspaceId) return null;
  try {
    await getGoogleSheetsAccessTokenForWorkspace(workspaceId);
    return "founder_oauth";
  } catch {
    return null;
  }
}

/** OAuth client for the Sheets API using the founder's Google sign-in. */
export async function founderSheetsAuth() {
  const workspaceId = await resolveFounderWorkspaceId();
  if (!workspaceId) throw new Error("No founder workspace found for owner-sheet export.");
  const accessToken = await getGoogleSheetsAccessTokenForWorkspace(workspaceId);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}
