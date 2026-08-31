import type {
  PublicMarketEvidenceCard,
  PublicMarketEvidenceSource,
} from "@/lib/intelligence/public-market-evidence/contracts";

export const PUBLIC_MARKET_EVIDENCE_SOURCES: PublicMarketEvidenceSource[] = [
  {
    sourceId: "deloitte-global-marketing-trends-2022",
    title: "2022 Global Marketing Trends",
    publisher: "Deloitte",
    sourceKind: "industry_report",
    publicationYear: 2022,
    sourceUrl:
      "https://www.deloitte.com/global/en/our-thinking/insights/topics/marketing-sales/global-marketing-trends.html",
    accessMode: "open",
    reliability: "high",
    notes:
      "Useful for customer centricity, first-party data, hybrid experience, and AI-assisted service strategy.",
  },
  {
    sourceId: "salesforce-state-of-marketing",
    title: "State of Marketing",
    publisher: "Salesforce",
    sourceKind: "industry_report",
    publicationYear: 2024,
    sourceUrl:
      "https://www.salesforce.com/resources/research-reports/state-of-marketing/",
    accessMode: "gated",
    reliability: "high",
    notes:
      "Useful for marketer priorities, AI adoption, personalization, data quality, and channel operating trends.",
  },
  {
    sourceId: "brightlocal-local-consumer-review-survey-2024",
    title: "Local Consumer Review Survey 2024",
    publisher: "BrightLocal",
    sourceKind: "benchmark_report",
    publicationYear: 2024,
    sourceUrl:
      "https://www.brightlocal.com/research/local-consumer-review-survey-2024/",
    accessMode: "open",
    reliability: "medium",
    notes:
      "Useful for local trust, review velocity, review quality, and Google Business Profile conversion context.",
  },
  {
    sourceId: "wordstream-google-ads-benchmarks-2024",
    title: "Google Ads Benchmarks 2024",
    publisher: "WordStream",
    sourceKind: "benchmark_report",
    publicationYear: 2024,
    sourceUrl:
      "https://www.wordstream.com/resources/search-advertising-benchmarks-for-2024-competitive-data-insights",
    accessMode: "gated",
    reliability: "medium",
    notes:
      "Useful for paid search CTR, CPC, conversion, and cost-per-lead comparison context.",
  },
  {
    sourceId: "datareportal-digital-2024-global-overview",
    title: "Digital 2024 Global Overview Report",
    publisher: "DataReportal",
    sourceKind: "industry_report",
    publicationYear: 2024,
    sourceUrl: "https://datareportal.com/reports/digital-2024-global-overview-report",
    accessMode: "open",
    reliability: "medium",
    notes:
      "Useful for digital adoption, channel reach, social behavior, ecommerce, and regional market context.",
  },
];

export const PUBLIC_MARKET_EVIDENCE_CARDS: PublicMarketEvidenceCard[] = [
  {
    evidenceId: "market-first-party-data-2022",
    sourceId: "deloitte-global-marketing-trends-2022",
    industry: "cross_industry",
    region: "global",
    year: 2022,
    topic: "first-party data",
    evidenceClass: "reported",
    applicability: ["analytics", "conversion", "customer_experience"],
    claim:
      "Marketing teams need stronger first-party data strategies as cookie-based targeting and measurement weaken.",
    reasoningUse:
      "Use when private analytics data is thin or fragmented, or when recommendations depend on conversion tracking quality.",
    confidence: 0.82,
    sourceUrl:
      "https://www.deloitte.com/global/en/our-thinking/insights/topics/marketing-sales/global-marketing-trends.html",
  },
  {
    evidenceId: "market-personalization-data-quality-2024",
    sourceId: "salesforce-state-of-marketing",
    industry: "cross_industry",
    region: "global",
    year: 2024,
    topic: "personalization and data quality",
    evidenceClass: "reported",
    applicability: ["analytics", "customer_experience", "conversion"],
    claim:
      "Marketing performance increasingly depends on usable customer data, personalization discipline, and trustworthy measurement operations.",
    reasoningUse:
      "Use when Anitrya sees traffic without enough downstream conversion or customer-quality evidence.",
    confidence: 0.8,
    sourceUrl:
      "https://www.salesforce.com/resources/research-reports/state-of-marketing/",
  },
  {
    evidenceId: "local-review-trust-2024",
    sourceId: "brightlocal-local-consumer-review-survey-2024",
    industry: "local_services",
    region: "US",
    year: 2024,
    topic: "reviews and local trust",
    evidenceClass: "benchmark",
    applicability: ["local_search", "conversion", "customer_experience"],
    claim:
      "Local-business conversion is strongly shaped by review quality, review recency, and visible trust signals.",
    reasoningUse:
      "Use when local search visibility exists but calls, directions, website clicks, or conversions lag.",
    confidence: 0.74,
    sourceUrl:
      "https://www.brightlocal.com/research/local-consumer-review-survey-2024/",
  },
  {
    evidenceId: "paid-search-benchmarking-2024",
    sourceId: "wordstream-google-ads-benchmarks-2024",
    industry: "cross_industry",
    region: "US",
    year: 2024,
    topic: "paid search efficiency",
    evidenceClass: "benchmark",
    applicability: ["paid_media", "conversion", "campaign_strategy"],
    claim:
      "Paid search performance should be interpreted against industry-level CTR, CPC, conversion rate, and lead-cost expectations.",
    reasoningUse:
      "Use when Google Ads evidence becomes available and the system needs external efficiency context.",
    confidence: 0.72,
    sourceUrl:
      "https://www.wordstream.com/resources/search-advertising-benchmarks-for-2024-competitive-data-insights",
  },
  {
    evidenceId: "digital-channel-context-2024",
    sourceId: "datareportal-digital-2024-global-overview",
    industry: "cross_industry",
    region: "global",
    year: 2024,
    topic: "digital channel behavior",
    evidenceClass: "reported",
    applicability: ["market_demand", "campaign_strategy", "seo", "paid_media"],
    claim:
      "Digital channel behavior varies by market, platform, and consumer adoption, so channel performance should be interpreted with regional context.",
    reasoningUse:
      "Use when recommendations compare organic, paid, local, and social demand assumptions.",
    confidence: 0.7,
    sourceUrl: "https://datareportal.com/reports/digital-2024-global-overview-report",
  },
];
