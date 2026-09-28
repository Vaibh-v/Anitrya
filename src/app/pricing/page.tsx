import Link from "next/link";
import { PLANS } from "@/lib/org/plans";
import { priceLabel } from "@/lib/billing/stripe-core";

export const metadata = { title: "Pricing · Anitrya" };


const PLAN_COPY: Record<string, { who: string; extras: string[] }> = {
  starter: { who: "One business", extras: ["Instant Insight dashboard", "Weekly insight email", "AI panel with verified numbers"] },
  growth: { who: "Growing teams", extras: ["Everything in Starter", "Team roles and client viewers", "Outcome tracking and learning"] },
  agency: { who: "Agencies with many clients", extras: ["Everything in Growth", "Per-client project access", "Priority support"] },
};

export default function PricingPage() {
  return (
    <main className="eye-shell">
      <header className="eye-top">
        <Link href="/" className="eye-logo"><span className="eye-logo-mark" />Anitrya</Link>
        <div className="eye-top-spacer" />
        <Link href="/help" className="eye-pill">Help</Link>
      </header>
      <section className="eye-pricing">
        <span className="eye-overline">Pricing</span>
        <h1>Start free for {PLANS.trial.trialDays} days. No card needed.</h1>
        <p className="eye-panel-text">Sign in with Google, pick your website, and see what to fix in under a minute. Choose a plan when the trial ends — your data stays either way.</p>
        <div className="eye-pricing-grid">
          {(["starter", "growth", "agency"] as const).map((id) => (
            <div key={id} className="eye-panel eye-pricing-card">
              <strong>{PLANS[id].label}</strong>
              <span className="eye-finding-muted">{PLAN_COPY[id].who}</span>
              <span className="eye-price">{priceLabel(id)}</span>
              <ul>
                <li>{PLANS[id].projects} projects (websites)</li>
                <li>{PLANS[id].seats} team seats</li>
                <li>{PLANS[id].aiPerMonth.toLocaleString()} AI answers a month</li>
                {PLAN_COPY[id].extras.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="eye-finding-muted" style={{ marginTop: 20 }}>
          <Link href="/">Start your free trial →</Link> · Prices exclude applicable taxes. Cancel any time from Settings → Plan.
        </p>
      </section>
    </main>
  );
}
