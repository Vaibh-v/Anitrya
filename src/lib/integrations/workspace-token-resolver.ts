import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptStoredSecret,
  encryptSecret,
  isEncryptedSecret,
} from "@/lib/security/crypto";

export const GOOGLE_OAUTH_PROVIDERS: IntegrationProvider[] = [
  IntegrationProvider.GOOGLE_GA4,
  IntegrationProvider.GOOGLE_GSC,
];

export type ResolveWorkspaceTokenInput = {
  workspaceId: string;
  acceptedProviders: string[];
  requiredScopes?: string[];
};

export type ResolvedWorkspaceToken = {
  tokenId: string;
  workspaceId: string;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scope: string[];
  refreshed: boolean;
};

type StoredTokenRecord = Awaited<
  ReturnType<typeof prisma.integrationToken.findMany>
>[number];

type HydratedTokenRecord = StoredTokenRecord & {
  decryptedAccessToken: string | null;
  decryptedRefreshToken: string | null;
  parsedScopes: string[];
};

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const TOKEN_REFRESH_BUFFER_SECONDS = 60;
const ALL_INTEGRATION_PROVIDERS = new Set<string>(Object.values(IntegrationProvider));

function normalizeAcceptedProviders(providers: string[]): IntegrationProvider[] {
  const normalized = providers
    .map((provider) => provider.trim().toUpperCase())
    .filter((provider): provider is IntegrationProvider =>
      ALL_INTEGRATION_PROVIDERS.has(provider)
    );

  return Array.from(new Set(normalized));
}

function parseScopes(scope: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (scope ?? "")
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function mergeScopes(...scopeValues: Array<string | null | undefined>) {
  const merged = Array.from(
    new Set(scopeValues.flatMap((value) => parseScopes(value)))
  );

  return merged.length > 0 ? merged.join(" ") : null;
}

function hasScopes(parsedScopes: string[], requiredScopes: string[]) {
  if (requiredScopes.length === 0) return true;

  const available = new Set(parsedScopes);
  return requiredScopes.every((scope) => available.has(scope));
}

function isGoogleProvider(provider: IntegrationProvider) {
  return GOOGLE_OAUTH_PROVIDERS.includes(provider);
}

function expandAcceptedProviders(providers: IntegrationProvider[]) {
  if (providers.some(isGoogleProvider)) {
    return Array.from(new Set([...providers, ...GOOGLE_OAUTH_PROVIDERS]));
  }

  return providers;
}

function isExpired(expiresAt: number | null | undefined) {
  if (!expiresAt) return true;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowInSeconds + TOKEN_REFRESH_BUFFER_SECONDS;
}

function rankProvider(
  provider: IntegrationProvider,
  acceptedProviders: IntegrationProvider[]
) {
  const index = acceptedProviders.indexOf(provider);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function hydrateToken(token: StoredTokenRecord): HydratedTokenRecord {
  return {
    ...token,
    decryptedAccessToken: decryptStoredSecret(token.accessToken),
    decryptedRefreshToken: decryptStoredSecret(token.refreshToken),
    parsedScopes: parseScopes(token.scope),
  };
}

function toResolvedToken(
  token: HydratedTokenRecord,
  overrides?: Partial<ResolvedWorkspaceToken>
): ResolvedWorkspaceToken {
  const accessToken = overrides?.accessToken ?? token.decryptedAccessToken;

  if (!accessToken) {
    throw new Error(`Resolved token for ${token.provider} has no access token.`);
  }

  return {
    tokenId: token.id,
    workspaceId: token.workspaceId,
    provider: token.provider,
    accessToken,
    refreshToken: overrides?.refreshToken ?? token.decryptedRefreshToken,
    expiresAt: overrides?.expiresAt ?? token.expiresAt,
    scope: overrides?.scope ?? token.parsedScopes,
    refreshed: overrides?.refreshed ?? false,
  };
}

async function persistEncryptedTokenIfNeeded(token: HydratedTokenRecord) {
  const needsAccessMigration =
    token.decryptedAccessToken &&
    token.accessToken &&
    !isEncryptedSecret(token.accessToken);

  const needsRefreshMigration =
    token.decryptedRefreshToken &&
    token.refreshToken &&
    !isEncryptedSecret(token.refreshToken);

  if (!needsAccessMigration && !needsRefreshMigration) {
    return;
  }

  await prisma.integrationToken.update({
    where: { id: token.id },
    data: {
      accessToken: needsAccessMigration
        ? encryptSecret(token.decryptedAccessToken!)
        : undefined,
      refreshToken: needsRefreshMigration
        ? encryptSecret(token.decryptedRefreshToken!)
        : undefined,
    },
  });
}

async function refreshGoogleToken(
  token: HydratedTokenRecord
): Promise<ResolvedWorkspaceToken> {
  const refreshToken = token.decryptedRefreshToken;

  if (!refreshToken) {
    throw new Error(
      `Workspace Google token for ${token.provider} is expired and no refresh token is stored. Reconnect Google for this workspace.`
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
      refresh_token: refreshToken,
    }),
  });

  const payload = (await response.json()) as GoogleRefreshResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Failed to refresh Google OAuth token for ${token.provider}.`
    );
  }

  const nextExpiresAt =
    Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);
  const nextRefreshToken = payload.refresh_token ?? refreshToken;
  const nextScope = mergeScopes(token.scope, payload.scope);

  await prisma.integrationToken.update({
    where: { id: token.id },
    data: {
      accessToken: encryptSecret(payload.access_token),
      refreshToken: encryptSecret(nextRefreshToken),
      expiresAt: nextExpiresAt,
      scope: nextScope,
    },
  });

  return {
    tokenId: token.id,
    workspaceId: token.workspaceId,
    provider: token.provider,
    accessToken: payload.access_token,
    refreshToken: nextRefreshToken,
    expiresAt: nextExpiresAt,
    scope: parseScopes(nextScope),
    refreshed: true,
  };
}

function buildMissingScopeError(
  requiredScopes: string[],
  tokens: HydratedTokenRecord[],
  acceptedProviders: IntegrationProvider[]
) {
  const providers = Array.from(new Set(tokens.map((token) => token.provider))).join(", ");

  return new Error(
    [
      "No workspace Google token was found with the required scopes.",
      `Required scopes: ${requiredScopes.join(", ")}.`,
      providers
        ? `Available token providers: ${providers}.`
        : `Accepted providers: ${acceptedProviders.join(", ")}.`,
    ].join(" ")
  );
}

export function isMissingWorkspaceTokenError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("No workspace token was found") ||
    error.message.includes("No workspace Google token was found")
  );
}

export async function resolveWorkspaceTokenRecord(
  input: ResolveWorkspaceTokenInput
): Promise<ResolvedWorkspaceToken> {
  const acceptedProviders = normalizeAcceptedProviders(input.acceptedProviders);

  if (acceptedProviders.length === 0) {
    throw new Error("No valid integration providers were supplied.");
  }

  const requiredScopes = parseScopes((input.requiredScopes ?? []).join(" "));
  const providersToQuery = expandAcceptedProviders(acceptedProviders);

  const storedTokens = await prisma.integrationToken.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: {
        in: providersToQuery,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (storedTokens.length === 0) {
    throw new Error(
      `No workspace token was found for the requested providers: ${acceptedProviders.join(", ")}.`
    );
  }

  const hydratedTokens = storedTokens.map(hydrateToken);
  const scopedTokens =
    requiredScopes.length > 0
      ? hydratedTokens.filter((token) => hasScopes(token.parsedScopes, requiredScopes))
      : hydratedTokens;

  if (scopedTokens.length === 0) {
    throw buildMissingScopeError(requiredScopes, hydratedTokens, acceptedProviders);
  }

  const sortedTokens = [...scopedTokens].sort((left, right) => {
    const rankDiff =
      rankProvider(left.provider, acceptedProviders) -
      rankProvider(right.provider, acceptedProviders);

    if (rankDiff !== 0) return rankDiff;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  const errors: string[] = [];

  for (const token of sortedTokens) {
    if (token.decryptedAccessToken && !isExpired(token.expiresAt)) {
      await persistEncryptedTokenIfNeeded(token);
      return toResolvedToken(token);
    }

    if (isGoogleProvider(token.provider) && token.decryptedRefreshToken) {
      try {
        return await refreshGoogleToken(token);
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : `Failed to refresh token for ${token.provider}.`
        );
      }
      continue;
    }

    if (token.decryptedAccessToken) {
      errors.push(
        `Workspace token for ${token.provider} is expired and cannot be refreshed.`
      );
    } else {
      errors.push(`Workspace token for ${token.provider} does not contain an access token.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  throw new Error(
    `No usable workspace token was found for providers: ${acceptedProviders.join(", ")}.`
  );
}

export async function resolveWorkspaceToken(
  input: ResolveWorkspaceTokenInput
): Promise<string> {
  const token = await resolveWorkspaceTokenRecord(input);
  return token.accessToken;
}