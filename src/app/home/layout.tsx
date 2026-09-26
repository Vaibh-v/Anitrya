import { ReactNode, Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HomeNavigation } from "@/components/dashboard/HomeNavigation";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  // Signed-out visitors to /home/* previously hit requireSession() inside each
  // page and got a 500 error screen. Send them to the sign-in page instead.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="eye-shell">
      <Suspense fallback={<header className="eye-top"><span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span></header>}>
        <HomeNavigation />
      </Suspense>
      <div className="eye-content">{children}</div>
    </div>
  );
}
