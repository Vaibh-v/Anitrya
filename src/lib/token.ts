import type { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RefreshResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function getValidAccessToken(params: {
  workspaceId: string;
  provider: IntegrationProvider;
}) {
  const token = await prisma.integrationToken.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: params.workspaceId,
        provider: params.provider
      }
    }
  });

  if (!token?.accessToken) return null;

  const now = Math.floor(Date.now() / 1000);
  const hasTimeLeft = token.expiresAt && token.expiresAt > now + 60;

  if (hasTimeLeft) {
    return token.accessToken;
  }

  if (!token.refreshToken) {
    return token.accessToken;
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: token.refreshToken
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const json = (await res.json()) as RefreshResponse;

  if (!res.ok || !json.access_token) {
    return token.accessToken;
  }

  const nextExpiresAt = json.expires_in
    ? Math.floor(Date.now() / 1000) + json.expires_in
    : token.expiresAt;

  await prisma.integrationToken.update({
    where: { id: token.id },
    data: {
      accessToken: json.access_token,
      expiresAt: nextExpiresAt ?? null,
      scope: json.scope ?? token.scope
    }
  });

  return json.access_token;
}