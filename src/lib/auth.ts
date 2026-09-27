import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { authProviders } from "@/lib/auth.config";
import { encryptSecret } from "@/lib/security/crypto";
import { acceptInvitesForUser } from "@/lib/org/members";

const GOOGLE_WORKSPACE_PROVIDERS: IntegrationProvider[] = [
  IntegrationProvider.GOOGLE_GA4,
  IntegrationProvider.GOOGLE_GSC,
];

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.APP_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.DATABASE_URL;

function mergeScopes(existing: string | null | undefined, next: string | null | undefined) {
  const scopes = new Set(
    [existing, next]
      .flatMap((value) => (value ?? "").split(/[\s,]+/))
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return scopes.size > 0 ? Array.from(scopes).join(" ") : null;
}

async function getSessionContextByEmail(email: string) {
  const dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!dbUser) return null;

  const workspace = await ensureWorkspaceForUser({
    userId: dbUser.id,
    email: dbUser.email,
  });

  return {
    userId: dbUser.id,
    workspaceId: workspace.id,
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: NEXTAUTH_SECRET,
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

      // Join any organizations this email was invited to before picking the workspace.
      await acceptInvitesForUser({ userId: dbUser.id, email: dbUser.email });

      const workspace = await ensureWorkspaceForUser({
        userId: dbUser.id,
        email: dbUser.email,
      });

      // Only the organization's owner/admin connects its Google sources. An
      // invited analyst or viewer signing in must never replace them.
      const membership = await prisma.membership.findFirst({
        where: { userId: dbUser.id, workspaceId: workspace.id },
        select: { role: true },
      });
      const firstMember = await prisma.membership.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
        select: { userId: true },
      });
      const hasGoogleTokens = (await prisma.integrationToken.count({
        where: { workspaceId: workspace.id, provider: { in: GOOGLE_WORKSPACE_PROVIDERS } },
      })) > 0;
      const role = String(membership?.role ?? "");
      const mayConnectSources =
        !hasGoogleTokens || role === "OWNER" || firstMember?.userId === dbUser.id;

      if (account?.provider === "google" && mayConnectSources) {
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
      const email = user?.email ?? (typeof token.email === "string" ? token.email : null);

      // Re-resolve the active organization every few seconds, so switching
      // organizations, accepting an invite or being removed takes effect
      // without signing out.
      const checkedAt = typeof token.workspaceCheckedAt === "number" ? token.workspaceCheckedAt : 0;
      if (
        email &&
        (typeof token.userId !== "string" ||
          typeof token.workspaceId !== "string" ||
          Date.now() - checkedAt > 5_000)
      ) {
        const sessionContext = await getSessionContextByEmail(email);

        if (sessionContext) {
          token.userId = sessionContext.userId;
          token.workspaceId = sessionContext.workspaceId;
          token.workspaceCheckedAt = Date.now();
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
