import { compilePublicEvidenceCorpus } from "@/lib/intelligence/public-market-evidence/corpus-compiler";
import { parsePublicEvidenceCorpusManifest } from "@/lib/intelligence/public-market-evidence/manifest-schema";
import { getPublicMarketEvidenceBundleFromCorpus } from "@/lib/intelligence/public-market-evidence/repository";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asTopics(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((topic): topic is string => typeof topic === "string")
    : [];
}

export async function buildPublicEvidenceImportPreview(input: {
  manifest: unknown;
  query?: unknown;
}) {
  const manifest = parsePublicEvidenceCorpusManifest(input.manifest);
  const corpus = compilePublicEvidenceCorpus(manifest);
  const query = input.query && typeof input.query === "object" ? input.query : {};
  const queryRecord = query as Record<string, unknown>;

  const bundle = await getPublicMarketEvidenceBundleFromCorpus({
    corpus,
    query: {
      projectLabel:
        asString(queryRecord.projectLabel) ?? asString(queryRecord.projectSlug) ?? "beta",
      projectSlug:
        asString(queryRecord.projectSlug) ?? asString(queryRecord.projectLabel) ?? "beta",
      industry: asString(queryRecord.industry),
      region: asString(queryRecord.region),
      topics: asTopics(queryRecord.topics),
      limit: typeof queryRecord.limit === "number" ? queryRecord.limit : 8,
    },
  });

  return {
    corpus: {
      corpusId: manifest.corpusId,
      name: manifest.name,
      version: manifest.version,
      documents: manifest.documents.length,
      entries: manifest.entries.length,
    },
    compileResult: corpus.result,
    bundle,
    persisted: false,
  };
}
