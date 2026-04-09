import { prisma } from "@/lib/prisma";

type IntegrationTokenRow = {
  accessToken: string | null;
};

function normalizeAccessToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getWorkspaceGoogleAccessToken(
  workspaceId: string,
): Promise<string> {
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new Error("workspaceId is required.");
  }

  const token = (await prisma.integrationToken.findFirst({
    where: {
      workspaceId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      accessToken: true,
    },
  })) as IntegrationTokenRow | null;

  const accessToken = normalizeAccessToken(token?.accessToken);

  if (!accessToken) {
    throw new Error("Invalid Credentials");
  }

  return accessToken;
}

export async function getGoogleAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return getWorkspaceGoogleAccessToken(workspaceId);
}

export async function getGoogleSheetsAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return getWorkspaceGoogleAccessToken(workspaceId);
}