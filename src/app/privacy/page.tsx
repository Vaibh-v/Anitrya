import Link from "next/link";

export const metadata = { title: "Privacy · Anitrya" };

const CONTACT = process.env.ANITRYA_CONTACT_EMAIL?.trim() || "privacy@anitrya.com";

export default function PrivacyPage() {
  return (
    <main className="eye-shell">
      <header className="eye-top">
        <Link href="/" className="eye-logo"><span className="eye-logo-mark" />Anitrya</Link>
      </header>
      <article className="eye-legal">
        <span className="eye-overline">Legal</span>
        <h1>Privacy policy</h1>
        <p>Last updated 28 September 2026. This policy explains what Anitrya collects, why, and your choices.</p>

        <h2>What we access</h2>
        <p>When you sign in with Google and connect a website, Anitrya reads — never writes — your Google Analytics 4 and Search Console data, and, if you connect them, Google Ads and Business Profile data. We store aggregated reports (for example sessions by day, source, landing page and country; search clicks and impressions by query and page). We do not receive your visitors&apos; names, emails or other personal details; Google provides these reports in aggregate.</p>
        <p>We also store your name, email address and profile picture from Google, your organization&apos;s members and roles, and your plan.</p>

        <h2>How we use it</h2>
        <ul>
          <li>To show your dashboards, findings and weekly email.</li>
          <li>To explain findings with AI models. Only the aggregated numbers for the finding are sent, never your Google credentials. Providers are chosen that do not train on this data; any provider whose free tier may use prompts for training is used only on Anitrya&apos;s own test data.</li>
          <li>To measure whether recommendations worked, and to improve which advice Anitrya gives. Seasonal search trends are combined across customers without names or websites attached.</li>
        </ul>
        <p>We do not sell your data or use it for advertising.</p>

        <h2>Who processes it</h2>
        <p>Vercel (hosting), Neon (database), Google (sign-in, data sources and Sheets archive), Resend (email), Stripe (payments), and the AI providers shown in the AI panel (for example Groq and Cerebras). Each processes data only to provide its service to us.</p>

        <h2>Retention and deletion</h2>
        <p>Data is kept while your organization is active. Older detail may be moved to an archive to keep the service fast. The organization owner can delete all of its data at any time from Settings → Plan → Delete this organization&apos;s data; archive copies are removed on request to {CONTACT} within 30 days. You can revoke Anitrya&apos;s Google access at any time at myaccount.google.com/permissions.</p>

        <h2>Security</h2>
        <p>Connections are encrypted in transit, access is limited by role, and every data request is scoped to your organization.</p>

        <h2>Contact</h2>
        <p>Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </article>
    </main>
  );
}
