import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccess } from "@/lib/org/access";
import { FounderConsole } from "@/components/founder/FounderConsole";

export const dynamic = "force-dynamic";

/** Founder-only console: every organization, plans, trials and test accounts. */
export default async function FounderPage() {
  const access = await getAccess();
  if (!access?.isFounder) redirect("/home");
  return (
    <main className="eye-shell">
      <header className="eye-top">
        <Link href="/home" className="eye-logo"><span className="eye-logo-mark" />Anitrya</Link>
        <span className="eye-pill">Founder console</span>
        <div className="eye-top-spacer" />
        <Link href="/home" className="eye-pill">Back to dashboard</Link>
      </header>
      <div className="eye-content">
        <FounderConsole />
      </div>
    </main>
  );
}
