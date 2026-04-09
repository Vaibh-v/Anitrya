import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { authProviders } from "@/lib/auth.config";
import { encryptSecret } from "@/lib/security/crypto";

const GOOGLE_WORKSPACE_PROVIDERS: IntegrationProvider[] = [
  IntegrationProvider.GOOGLE_GA4,
  IntegrationProvider.GOOGLE_GSC,
];

function mergeScopes(existing: string | null | undefined, next: string | null | undefined) {
  const scopes = new Set(
    [existing, next]
      .flatMap((value) => (value ?? "").split(/[\s,]+/))
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return scopes.size > 0 ? Array.from(scopes).join(" ") : null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: authProviders,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        },
      });

      const workspace = await ensureWorkspaceForUser({
        userId: dbUser.id,
        email: dbUser.email,
      });

      if (account?.provider === "google") {
        const existingTokens = await prisma.integrationToken.findMany({
          where: {
            workspaceId: workspace.id,
            provider: {
              in: GOOGLE_WORKSPACE_PROVIDERS,
            },
          },
        });

        const existingByProvider = new Map(
          existingTokens.map((token) => [token.provider, token])
        );

        const nextAccessToken = account.access_token
          ? encryptSecret(account.access_token)
          : null;

        const nextRefreshToken = account.refresh_token
          ? encryptSecret(account.refresh_token)
          : null;

        await Promise.all(
          GOOGLE_WORKSPACE_PROVIDERS.map((provider) => {
            const existing = existingByProvider.get(provider);

            return prisma.integrationToken.upsert({
              where: {
                workspaceId_provider: {
                  workspaceId: workspace.id,
                  provider,
                },
              },
              update: {
                accessToken: nextAccessToken ?? existing?.accessToken ?? null,
                refreshToken: nextRefreshToken ?? existing?.refreshToken ?? null,
                expiresAt:
                  typeof account.expires_at === "number"
                    ? account.expires_at
                    : existing?.expiresAt ?? null,
                scope: mergeScopes(existing?.scope, account.scope),
                userId: dbUser.id,
              },
              create: {
                workspaceId: workspace.id,
                provider,
                accessToken: nextAccessToken,
                refreshToken: nextRefreshToken,
                expiresAt:
                  typeof account.expires_at === "number"
                    ? account.expires_at
                    : null,
                scope: mergeScopes(null, account.scope),
                userId: dbUser.id,
              },
            });
          })
        );
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (dbUser) {
          const workspace = await ensureWorkspaceForUser({
            userId: dbUser.id,
            email: dbUser.email,
          });

          token.userId = dbUser.id;
          token.workspaceId = workspace.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!session.user) return session;

      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      if (typeof token.workspaceId === "string") {
        session.user.workspaceId = token.workspaceId;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/home`;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/home`;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
};

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return session;
}