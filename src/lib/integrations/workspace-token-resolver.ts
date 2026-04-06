import { prisma } from "@/lib/prisma";

type ResolveWorkspaceTokenInput = {
  workspaceId: string;
  acceptedProviders: string[];
  requiredScopes?: string[];
};

function hasScopes(scope: string | null | undefined, requiredScopes: string[]) {
  if (requiredScopes.length === 0) return true;
  if (!scope) return false;
  return requiredScopes.every((required) => scope.includes(required));
}

export async function resolveWorkspaceToken(
  input: ResolveWorkspaceTokenInput
): Promise<string> {
  const tokens = await prisma.integrationToken.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: {
        in: input.acceptedProviders as any[],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      accessToken: true,
      provider: true,
      scope: true,
      updatedAt: true,
    },
  });

  const chosen =
    tokens.find(
      (token) =>
        Boolean(token.accessToken) &&
        hasScopes(token.scope, input.requiredScopes ?? [])
    ) ?? null;

  if (!chosen?.accessToken) {
    throw new Error(
      input.requiredScopes?.length
        ? "No workspace Google token was found with the required scopes."
        : "No workspace token was found for the requested providers."
    );
  }

  return chosen.accessToken;
}