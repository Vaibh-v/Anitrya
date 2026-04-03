"use server";

import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/security/crypto";

function normalizeProvider(provider: string): IntegrationProvider {
  const normalized = provider.trim();

  const map: Record<string, IntegrationProvider> = {
    GOOGLE_GA4: IntegrationProvider.GOOGLE_GA4,
    GOOGLE_GSC: IntegrationProvider.GOOGLE_GSC,
    GOOGLE_GBP: IntegrationProvider.GOOGLE_GBP,
    GOOGLE_ADS: IntegrationProvider.GOOGLE_ADS,

    google_ga4: IntegrationProvider.GOOGLE_GA4,
    google_gsc: IntegrationProvider.GOOGLE_GSC,
    google_gbp: IntegrationProvider.GOOGLE_GBP,
    google_ads: IntegrationProvider.GOOGLE_ADS,
  };

  const resolved = map[normalized] ?? map[normalized.toUpperCase()];

  if (!resolved) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return resolved;
}

export async function connectApiKeyProvider(input: {
  provider: string;
  apiKey: string;
}) {
  const session = await requireSession();

  const workspaceId = session.user?.workspaceId;
  const userId = session.user?.id;

  if (!workspaceId) {
    throw new Error("Missing workspace context");
  }

  if (!userId) {
    throw new Error("Missing user context");
  }

  if (!input.apiKey || input.apiKey.trim().length < 10) {
    throw new Error("Invalid API key format");
  }

  const provider = normalizeProvider(input.provider);
  const encrypted = encryptSecret(input.apiKey.trim());

  await prisma.integrationToken.upsert({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
    update: {
      accessToken: encrypted,
      userId,
      updatedAt: new Date(),
    },
    create: {
      workspaceId,
      provider,
      accessToken: encrypted,
      userId,
    },
  });

  return { ok: true };
}

export async function disconnectProvider(providerInput: string) {
  const session = await requireSession();

  const workspaceId = session.user?.workspaceId;

  if (!workspaceId) {
    throw new Error("Missing workspace context");
  }

  const provider = normalizeProvider(providerInput);

  await prisma.integrationToken.deleteMany({
    where: {
      workspaceId,
      provider,
    },
  });

  return { ok: true };
}