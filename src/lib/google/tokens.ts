import { prisma } from "@/lib/prisma";

type SessionLike = {
  user?: {
    id?: string;
    email?: string | null;
    workspaceId?: string;
  };
  accessToken?: string;
};

type SupportedProvider =
  | "GOOGLE_GA4"
  | "GOOGLE_GSC"
  | "GOOGLE_GBP"
  | "GOOGLE_ADS";

function hasScopes(scope: string | null, requiredScopes: string[]) {
  if (!scope) return false;
  return requiredScopes.every((required) => scope.includes(required));
}

export function getAccessToken(session: SessionLike): string {
  const token = session?.accessToken;

  if (!token) {
    throw Object.assign(
      new Error(
        "Missing access token on session. Use workspace token resolution for database-session flows."
      ),
      { status: 401 }
    );
  }

  return token;
}

export async function getWorkspaceGoogleAccessToken(
  session: SessionLike,
  options?: {
    acceptedProviders?: SupportedProvider[];
    requiredScopes?: string[];
  }
): Promise<string> {
  const workspaceId = session?.user?.workspaceId;

  if (!workspaceId) {
    throw Object.assign(new Error("Missing workspaceId on session."), {
      status: 401,
    });
  }

  const acceptedProviders =
    options?.acceptedProviders ?? ["GOOGLE_GA4", "GOOGLE_GSC"];
  const requiredScopes = options?.requiredScopes ?? [];

  const tokens = await prisma.integrationToken.findMany({
    where: {
      workspaceId,
      provider: {
        in: acceptedProviders,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      provider: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      scope: true,
      updatedAt: true,
    },
  });

  const eligible = tokens.filter(
    (token) =>
      Boolean(token.accessToken) && hasScopes(token.scope, requiredScopes)
  );

  const chosen =
    eligible[0] ?? tokens.find((token) => Boolean(token.accessToken));

  if (!chosen?.accessToken) {
    throw Object.assign(
      new Error(
        "No connected Google token was found for this workspace. Reconnect a Google integration from Settings."
      ),
      { status: 401 }
    );
  }

  return chosen.accessToken;
}

export async function getGoogleSheetsAccessTokenForSession(
  session: SessionLike
): Promise<string> {
  const workspaceId = session?.user?.workspaceId;

  if (!workspaceId) {
    throw Object.assign(new Error("Missing workspaceId on session."), {
      status: 401,
    });
  }

  const tokens = await prisma.integrationToken.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      provider: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      scope: true,
      updatedAt: true,
    },
  });

  const usable = tokens.find(
    (token) =>
      Boolean(token.accessToken) &&
      typeof token.scope === "string" &&
      token.scope.includes("https://www.googleapis.com/auth/spreadsheets")
  );

  if (!usable?.accessToken) {
    throw Object.assign(
      new Error(
        "No Google token with Sheets permission was found for this workspace. Reconnect Google with Sheets access and then retry export."
      ),
      { status: 401 }
    );
  }

  return usable.accessToken;
}