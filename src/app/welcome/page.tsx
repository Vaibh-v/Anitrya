import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ add?: string }> };

/** First-run: pick a website, then watch the dashboard build (Instant Insight). */
export default async function WelcomePage(props: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) redirect("/");

  const params = (await props.searchParams) ?? {};
  const projectCount = await prisma.project.count({ where: { workspaceId } });
  if (projectCount > 0 && params.add !== "1") redirect("/home");

  const firstName = session.user?.name?.split(" ")[0] ?? null;

  return (
    <main className="eye-shell eye-welcome">
      <header className="eye-top">
        <span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span>
        <div className="eye-top-spacer" />
        <a className="eye-pill" href="/help" target="_blank" rel="noreferrer">Help</a>
      </header>
      <OnboardingFlow firstName={firstName} returning={projectCount > 0} />
    </main>
  );
}
