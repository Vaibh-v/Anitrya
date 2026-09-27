/** Pairs GA4 properties with Search Console sites by shared name words (client-safe, no DB). */
export type Option = { id: string; label: string };

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/\(\d+\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !["https", "http", "domain", "www"].includes(word));
}

function siteHost(label: string) {
  return label.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

/** Best-effort pairing of a GA4 property with a Search Console site by shared name words. */
export function suggestSite(ga4: Option, sites: Option[]): Option | null {
  const tokens = words(ga4.label);
  let best: { site: Option; score: number } | null = null;
  for (const site of sites) {
    const host = siteHost(site.label).toLowerCase();
    const score = tokens.filter((token) => host.includes(token)).length;
    if (score > 0 && (!best || score > best.score)) best = { site, score };
  }
  return best?.site ?? null;
}

export function propertyName(label: string) {
  return label.replace(/\s*\(\d+\)\s*$/, "").replace(/\s*-\s*GA4$/i, "").trim() || label;
}
