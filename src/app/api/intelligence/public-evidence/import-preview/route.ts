import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireSession } from "@/lib/auth";
import { buildPublicEvidenceImportPreview } from "@/lib/intelligence/public-market-evidence/import-preview";

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
    const preview = await buildPublicEvidenceImportPreview({
      manifest: body?.manifest ?? body,
      query: body?.query,
    });

    return NextResponse.json({
      ok: true,
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
