import { IntegrationProvider } from "@prisma/client";
import {
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
  GOOGLE_SHEETS_SCOPE,
} from "@/lib/auth.config";
import { resolveWorkspaceToken } from "@/lib/integrations/workspace-token-resolver";

function normalizeWorkspaceId(workspaceId: string) {
  const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";

  if (!normalized) {
    throw new Error("workspaceId is required.");
  }

  return normalized;
}

async function resolveGoogleToken(input: {
  workspaceId: string;
  acceptedProviders: IntegrationProvider[];
  requiredScopes: string[];
}) {
  return resolveWorkspaceToken({
    workspaceId: normalizeWorkspaceId(input.workspaceId),
    acceptedProviders: input.acceptedProviders,
    requiredScopes: input.requiredScopes,
  });
}

export async function getWorkspaceGoogleAccessToken(
  workspaceId: string,
): Promise<string> {
  return resolveGoogleToken({
    workspaceId,
    acceptedProviders: [
      IntegrationProvider.GOOGLE_GA4,
      IntegrationProvider.GOOGLE_GSC,
    ],
    requiredScopes: [],
  });
}

export async function getGoogleAnalyticsAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return resolveGoogleToken({
    workspaceId,
    acceptedProviders: [IntegrationProvider.GOOGLE_GA4],
    requiredScopes: [GOOGLE_ANALYTICS_SCOPE],
  });
}

export async function getGoogleSearchConsoleAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return resolveGoogleToken({
    workspaceId,
    acceptedProviders: [IntegrationProvider.GOOGLE_GSC],
    requiredScopes: [GOOGLE_SEARCH_CONSOLE_SCOPE],
  });
}

export async function getGoogleAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return resolveGoogleToken({
    workspaceId,
    acceptedProviders: [
      IntegrationProvider.GOOGLE_GA4,
      IntegrationProvider.GOOGLE_GSC,
    ],
    requiredScopes: [GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE],
  });
}

export async function getGoogleSheetsAccessTokenForWorkspace(
  workspaceId: string,
): Promise<string> {
  return resolveGoogleToken({
    workspaceId,
    acceptedProviders: [
      IntegrationProvider.GOOGLE_GA4,
      IntegrationProvider.GOOGLE_GSC,
    ],
    requiredScopes: [GOOGLE_SHEETS_SCOPE],
  });
}