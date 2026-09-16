import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireSession } from "@/lib/auth";
import { buildPublicEvidenceImportPreview } from "@/lib/intelligence/public-market-evidence/import-preview";

const MAX_MANIFEST_BYTES = 1024 * 1024;

function validationError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function asManifestUrl(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw Object.assign(new Error("manifestUrl is required."), { status: 400 });
  }

  const url = new URL(value.trim());

  if (url.protocol !== "https:") {
    throw Object.assign(new Error("manifestUrl must use https."), {
      status: 400,
    });
  }

  return url;
}

async function readManifestFromUrl(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain;q=0.8, */*;q=0.5",
    },
  });

  if (!response.ok) {
    throw Object.assign(
      new Error(`Failed to fetch manifest URL: ${response.status}.`),
      { status: 400 },
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > MAX_MANIFEST_BYTES) {
    throw Object.assign(new Error("Manifest URL response is too large."), {
      status: 413,
    });
  }

  const text = await response.text();

  if (Buffer.byteLength(text, "utf8") > MAX_MANIFEST_BYTES) {
    throw Object.assign(new Error("Manifest URL response is too large."), {
      status: 413,
    });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("Manifest URL did not return valid JSON."), {
      status: 400,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json().catch(() => null);
    const url = asManifestUrl(body?.manifestUrl);
    const manifest = await readManifestFromUrl(url);
    const preview = await buildPublicEvidenceImportPreview({
      manifest,
      query: body?.query,
    });

    return NextResponse.json({
      ok: true,
      source: {
        manifestUrl: url.toString(),
      },
      ...preview,
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
            : "Public evidence URL import preview failed.",
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
