import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireSession } from "@/lib/auth";
import { compilePublicEvidenceCorpus } from "@/lib/intelligence/public-market-evidence/corpus-compiler";
import { parsePublicEvidenceCorpusManifest } from "@/lib/intelligence/public-market-evidence/manifest-schema";
import { getPublicMarketEvidenceBundleFromCorpus } from "@/lib/intelligence/public-market-evidence/repository";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function validationError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);
    const manifest = parsePublicEvidenceCorpusManifest(body?.manifest ?? body);
    const corpus = compilePublicEvidenceCorpus(manifest);
    const queryBody = body?.query ?? {};

    const bundle = await getPublicMarketEvidenceBundleFromCorpus({
      corpus,
      query: {
        projectLabel:
          asString(queryBody.projectLabel) ?? asString(queryBody.projectSlug) ?? "beta",
        projectSlug:
          asString(queryBody.projectSlug) ?? asString(queryBody.projectLabel) ?? "beta",
        industry: asString(queryBody.industry),
        region: asString(queryBody.region),
        topics: Array.isArray(queryBody.topics)
          ? queryBody.topics.filter((topic: unknown) => typeof topic === "string")
          : [],
        limit: typeof queryBody.limit === "number" ? queryBody.limit : 8,
      },
    });

    return NextResponse.json({
      ok: true,
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
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid public evidence corpus manifest.",
          issues: validationError(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Public evidence import preview failed.",
      },
      {
        status:
          typeof (error as { status?: unknown }).status === "number"
            ? (error as { status: number }).status
            : 500,
      },
    );
  }
}
