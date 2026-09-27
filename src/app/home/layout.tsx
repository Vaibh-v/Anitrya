import { ReactNode, Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HomeNavigation } from "@/components/dashboard/HomeNavigation";
import { prisma } from "@/lib/prisma";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  // Signed-out visitors to /home/* previously hit requireSession() inside each
  // page and got a 500 error screen. Send them to the sign-in page instead.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  // First run: a workspace with no projects goes to onboarding instead of an empty dashboard.
  const workspaceId = session.user?.workspaceId;
  if (workspaceId && (await prisma.project.count({ where: { workspaceId } })) === 0) redirect("/welcome");

  return (
    <div className="eye-shell">
      <Suspense fallback={<header className="eye-top"><span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span></header>}>
        <HomeNavigation />
      </Suspense>
      <div className="eye-content">{children}</div>
    </div>
  );
}
