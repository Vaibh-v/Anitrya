import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/SignInButton";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let isSignedIn = false;

  try {
    isSignedIn = Boolean((await getServerSession(authOptions))?.user);
  } catch (error) {
    console.error("Landing page session lookup failed", error);
  }

  return (
    <main className="eye-shell eye-landing">
      <header className="eye-top">
        <span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span>
        <div className="eye-top-spacer" />
        <span className="eye-pill">Analytics intelligence</span>
      </header>
      <div className="eye-landing-content">
        <section className="eye-landing-copy">
          <span className="eye-overline">Anitrya / God&apos;s Eye</span>
          <h1>A clearer view of what matters next.</h1>
          <p>Bring your analytics evidence together, see the gaps, and turn connected signals into accountable decisions.</p>
          <div className="eye-landing-actions">
            {isSignedIn ? <Link className="eye-primary" href="/home">Open workspace →</Link> : <SignInButton />}
            <a href="#preview" className="eye-secondary">Explore the interface ↓</a>
          </div>
          <div className="eye-landing-sources" aria-label="Evidence sources">
            <span>GA4</span><span>Search Console</span><span>Google Ads</span><span>Business Profile</span>
          </div>
        </section>
        <section className="eye-landing-preview eye-panel" id="preview" aria-label="Interface preview">
          <div className="eye-preview-header"><span className="eye-logo-mark" /><span>Market intelligence</span><span className="eye-tag">Interface preview</span></div>
          <div className="eye-preview-kpis"><span>Acquisition<em>GA4</em></span><span>Search demand<em>GSC</em></span><span>Local presence<em>GBP</em></span></div>
          <div className="eye-preview-orbit"><div className="eye-preview-globe" /><div className="eye-preview-focus">Your market, in focus.<small>Connect sources to uncover real signals.</small></div></div>
          <div className="eye-preview-bottom"><span>Source coverage</span><span>Decision brief</span><span>Next actions</span></div>
        </section>
      </div>
      <footer className="eye-landing-footer">Anitrya · Evidence first. Decisions second.</footer>
    </main>
  );
}
