/**
 * Instant tab switch: Next.js shows this skeleton the moment a tab link is
 * clicked (and prefetches up to it), while the server streams the real page.
 */
export default function HomeLoading() {
  return (
    <main className="eye-page eye-skeleton" aria-busy="true" aria-label="Loading">
      <section className="eye-heading">
        <div>
          <span className="eye-skel eye-skel-line" style={{ width: 120 }} />
          <span className="eye-skel eye-skel-title" />
          <span className="eye-skel eye-skel-line" style={{ width: "46%" }} />
        </div>
      </section>
      <div className="eye-kpis">
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className="eye-panel eye-kpi">
            <span className="eye-skel eye-skel-line" style={{ width: 90 }} />
            <span className="eye-skel eye-skel-number" />
            <span className="eye-skel eye-skel-line" style={{ width: 70 }} />
          </article>
        ))}
      </div>
      <div className="eye-split">
        {[0, 1].map((i) => (
          <article key={i} className="eye-panel">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <span key={r} className="eye-skel eye-skel-row" />
            ))}
          </article>
        ))}
      </div>
    </main>
  );
}
