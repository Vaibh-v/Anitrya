import { z } from "zod";
import type { PublicEvidenceCorpusManifest } from "@/lib/intelligence/public-market-evidence/corpus-contracts";

const sourceKindSchema = z.enum([
  "industry_report",
  "benchmark_report",
  "case_study",
  "trend_dataset",
  "news_archive",
  "web_archive",
]);

const evidenceClassSchema = z.enum([
  "observed",
  "reported",
  "benchmark",
  "estimated",
  "inferred",
]);

const applicabilitySchema = z.enum([
  "analytics",
  "seo",
  "paid_media",
  "local_search",
  "behavior",
  "conversion",
  "customer_experience",
  "market_demand",
  "campaign_strategy",
]);

export const publicEvidenceCorpusManifestSchema = z.object({
  corpusId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  generatedAt: z.string().trim().optional(),
  documents: z
    .array(
      z.object({
        documentId: z.string().trim().min(1),
        title: z.string().trim().min(1),
        publisher: z.string().trim().min(1),
        sourceKind: sourceKindSchema,
        publicationYear: z.number().int().min(1900).max(2100),
        sourceUrl: z.string().trim().url(),
        accessMode: z.enum(["open", "gated", "paid", "api"]),
        reliability: z.enum(["low", "medium", "high"]),
        storage: z.object({
          provider: z.enum(["seed", "google_drive", "external_url"]),
          folderPath: z.string().trim().optional(),
          fileName: z.string().trim().optional(),
          fileId: z.string().trim().optional(),
          mimeType: z.string().trim().optional(),
        }),
        notes: z.string().trim(),
      }),
    )
    .min(1),
  entries: z
    .array(
      z.object({
        entryId: z.string().trim().min(1),
        documentId: z.string().trim().min(1),
        industry: z.string().trim().min(1),
        subIndustry: z.string().trim().optional(),
        region: z.string().trim().min(1),
        year: z.number().int().min(1900).max(2100),
        topic: z.string().trim().min(1),
        evidenceClass: evidenceClassSchema,
        applicability: z.array(applicabilitySchema).min(1),
        claim: z.string().trim().min(12),
        reasoningUse: z.string().trim().min(12),
        confidence: z.number().min(0).max(1),
        extraction: z.object({
          method: z.enum(["manual_seed", "manual_review", "parser", "api"]),
          locator: z.string().trim().optional(),
          extractedAt: z.string().trim().optional(),
        }),
      }),
    )
    .min(1),
});

export function parsePublicEvidenceCorpusManifest(
  value: unknown,
): PublicEvidenceCorpusManifest {
  return publicEvidenceCorpusManifestSchema.parse(value);
}
