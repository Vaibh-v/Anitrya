import Link from "next/link";

export const metadata = { title: "Terms · Anitrya" };

const CONTACT = process.env.ANITRYA_CONTACT_EMAIL?.trim() || "privacy@anitrya.com";

export default function TermsPage() {
  return (
    <main className="eye-shell">
      <header className="eye-top">
        <Link href="/" className="eye-logo"><span className="eye-logo-mark" />Anitrya</Link>
      </header>
      <article className="eye-legal">
        <span className="eye-overline">Legal</span>
        <h1>Terms of service</h1>
        <p>Last updated 28 September 2026. By using Anitrya you agree to these terms.</p>
        <h2>The service</h2>
        <p>Anitrya analyses marketing data you connect and suggests actions. Findings and AI explanations are estimates based on your data; they are guidance, not guarantees, and you remain responsible for decisions you make.</p>
        <h2>Your account</h2>
        <p>You must have the right to connect the Google properties you add. The organization owner controls members, roles and billing. Keep your Google account secure.</p>
        <h2>Trials and payment</h2>
        <p>New organizations get a free trial. After it ends, the organization becomes read-only until a plan is chosen; no data is deleted. Paid plans renew monthly through Stripe until cancelled in Settings → Plan; cancellation takes effect at the end of the paid period.</p>
        <h2>Acceptable use</h2>
        <p>Don&apos;t misuse the service, attempt to access other organizations&apos; data, or resell it without agreement.</p>
        <h2>Your data</h2>
        <p>You own your data. See the <Link href="/privacy">privacy policy</Link> for how it is handled and deleted.</p>
        <h2>Liability</h2>
        <p>The service is provided as is. To the extent the law allows, our liability is limited to the fees you paid in the three months before a claim.</p>
        <h2>Contact</h2>
        <p><a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </article>
    </main>
  );
}
