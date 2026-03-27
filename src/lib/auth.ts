import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { authProviders } from "@/lib/auth.config";

function integrationProviderFor(provider?: string) {
  if (provider === "google-gsc") return "GOOGLE_GSC" as const;
  if (provider === "google-ga4") return "GOOGLE_GA4" as const;
  return null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: authProviders,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined
        },
        create: {
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null
        }
      });

      const workspace = await ensureWorkspaceForUser({
        userId: dbUser.id,
        email: dbUser.email
      });

      const provider = integrationProviderFor(account?.provider);

      if (provider) {
        await prisma.integrationToken.upsert({
          where: {
            workspaceId_provider: {
              workspaceId: workspace.id,
              provider
            }
          },
          update: {
            accessToken: account?.access_token ?? null,
            refreshToken: account?.refresh_token ?? null,
            expiresAt: account?.expires_at ?? null,
            scope: account?.scope ?? null,
            userId: dbUser.id
          },
          create: {
            workspaceId: workspace.id,
            provider,
            accessToken: account?.access_token ?? null,
            refreshToken: account?.refresh_token ?? null,
            expiresAt: account?.expires_at ?? null,
            scope: account?.scope ?? null,
            userId: dbUser.id
          }
        });
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (user) {
        const workspace = await ensureWorkspaceForUser({
          userId: user.id,
          email: user.email
        });

        session.user.id = user.id;
        session.user.workspaceId = workspace.id;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/home`;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/home`;
    }
  },
  pages: {
    signIn: "/",
    error: "/auth/error"
  }
};