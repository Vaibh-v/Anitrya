import { prisma } from "@/lib/prisma";

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function isExpired(expiresAt: number | null | undefined): boolean {
  if (!expiresAt) return true;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowInSeconds + 60;
}

export async function getValidWorkspaceGoogleAccessToken(input: {
  workspaceId: string;
}) {
  const tokens = await prisma.integrationToken.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: {
        in: ["GOOGLE_GA4", "GOOGLE_GSC"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const tokenRecord = tokens.find(
    (item) => typeof item.accessToken === "string" && item.accessToken.length > 0
  );

  if (!tokenRecord) {
    throw new Error("No Google integration token found for this workspace.");
  }

  if (!isExpired(tokenRecord.expiresAt) && tokenRecord.accessToken) {
    return tokenRecord.accessToken;
  }

  if (!tokenRecord.refreshToken) {
    throw new Error(
      "Google access token expired and no refresh token is available. Reconnect Google."
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokenRecord.refreshToken,
    }),
  });

  const payload = (await response.json()) as GoogleRefreshResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Failed to refresh Google access token."
    );
  }

  const nextExpiresAt =
    Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);

  await prisma.integrationToken.update({
    where: {
      workspaceId_provider: {
        workspaceId: tokenRecord.workspaceId,
        provider: tokenRecord.provider,
      },
    },
    data: {
      accessToken: payload.access_token,
      expiresAt: nextExpiresAt,
      scope: payload.scope ?? tokenRecord.scope,
    },
  });

  return payload.access_token;
}