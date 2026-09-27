import Link from "next/link";

export const metadata = { title: "Help · Anitrya" };

const ARTICLES = [
  {
    id: "start",
    title: "Getting started in under a minute",
    body: [
      "Sign in with the Google account that can see your Google Analytics 4 property and Search Console site.",
      "Pick your website on the welcome screen. Anitrya pairs your GA4 property with its Search Console site automatically; change the pairing if needed.",
      "The dashboard opens as soon as the last 7 days are ready, usually in under a minute. The 28- and 90-day history keeps loading in the background — watch for the “Updating” pill in the top bar.",
    ],
  },
  {
    id: "tabs",
    title: "What each tab is for",
    body: [
      "Overview — the headline numbers for the selected project and date range, and what to do next.",
      "SEO — search demand from Search Console: clicks, impressions, click-through rate, position, top queries and pages.",
      "Behavior — traffic from GA4: sources, landing pages, engagement and key events (conversions).",
      "Intelligence — ranked findings with the evidence, impact, confidence and one action each. Start at the top.",
      "Settings — projects, connected sources, sync history, exports and health.",
    ],
  },
  {
    id: "findings",
    title: "Reading a finding",
    body: [
      "Every finding compares the selected period with the previous period of the same length.",
      "Impact is an estimate in its own unit (clicks, sessions, conversions). Confidence reflects how much data supports it — a finding on a few hundred impressions is less certain than one on tens of thousands.",
      "“Do this” is the single most useful next step. Act on the highest-priority findings first and check the result after the next sync.",
      "Spam queries (gambling or adult terms that have nothing to do with your business) are reported once and excluded from every other finding so they don't distort your numbers.",
    ],
  },
  {
    id: "sync",
    title: "How syncing works",
    body: [
      "Anitrya refreshes your data automatically each time you open it, if the last refresh is older than 6 hours. You never need to press a sync button.",
      "It loads the last 7 days first, then 28, then 90, so recent numbers appear fastest.",
      "Google's own data can lag 1–2 days, so the most recent day is often incomplete and is never flagged as an anomaly.",
    ],
  },
  {
    id: "sources",
    title: "Connecting Google Ads and Business Profile",
    body: [
      "Google Ads needs a developer token with Basic access, created in Google Ads under Tools → API Center.",
      "Business Profile needs Google to approve API access for the Cloud project; until then its quota is 0 requests per minute.",
      "Once available, choose the Ads account or Business Profile location for each project in Settings → Sources.",
    ],
  },
  {
    id: "export",
    title: "Exporting to Google Sheets",
    body: [
      "Settings → Export writes this project's evidence and findings into a Google Sheet you can edit.",
      "Use a sheet your Google account can edit. Each project's rows are tagged, so several projects can share one sheet.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="eye-shell">
      <header className="eye-top">
        <Link href="/home" className="eye-logo"><span className="eye-logo-mark" />Anitrya</Link>
        <div className="eye-top-spacer" />
        <Link href="/home" className="eye-pill">Back to dashboard</Link>
      </header>
      <div className="eye-help">
        <aside className="eye-help-nav" aria-label="Help topics">
          <p className="eye-overline">Help center</p>
          {ARTICLES.map((article) => (
            <a key={article.id} href={`#${article.id}`}>{article.title}</a>
          ))}
        </aside>
        <div className="eye-help-body">
          <h1>How to get the most out of Anitrya</h1>
          {ARTICLES.map((article) => (
            <section key={article.id} id={article.id} className="eye-panel eye-help-article">
              <h2>{article.title}</h2>
              {article.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
