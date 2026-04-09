import type { IntegrationProvider } from "@prisma/client";
import {
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
} from "@/lib/auth.config";
import {
  isMissingWorkspaceTokenError,
  resolveWorkspaceTokenRecord,
} from "@/lib/integrations/workspace-token-resolver";

function requiredScopesForProvider(provider: IntegrationProvider) {
  if (provider === "GOOGLE_GA4") {
    return [GOOGLE_ANALYTICS_SCOPE];
  }

  if (provider === "GOOGLE_GSC") {
    return [GOOGLE_SEARCH_CONSOLE_SCOPE];
  }

  return [];
}

export async function getValidAccessToken(params: {
  workspaceId: string;
  provider: IntegrationProvider;
}) {
  try {
    const token = await resolveWorkspaceTokenRecord({
      workspaceId: params.workspaceId,
      acceptedProviders: [params.provider],
      requiredScopes: requiredScopesForProvider(params.provider),
    });

    return token.accessToken;
  } catch (error) {
    if (isMissingWorkspaceTokenError(error)) {
      return null;
    }

    throw error;
  }
}