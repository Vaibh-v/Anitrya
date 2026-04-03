import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

const ACTIVE_PROVIDER_KEYS = new Set([
  "google_ga4",
  "google_gsc",
  "google_gbp",
  "google_ads",
]);

const PRESERVED_PROVIDER_KEYS = new Set([
  "google_trends",
  "google_sheets",
  "openai_chatgpt",
  "google_gemini",
  "anthropic_claude",
  "semrush",
  "linkwhisper",
  "birdeye",
]);

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = session.user?.workspaceId ?? null;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      providerKey?: string;
      enabled?: boolean;
    };

    const providerKey = body.providerKey?.trim();
    if (!providerKey) {
      return NextResponse.json(
        { error: "Provider key is required." },
        { status: 400 }
      );
    }

    if (PRESERVED_PROVIDER_KEYS.has(providerKey)) {
      return NextResponse.json(
        {
          error:
            "This provider is preserved in architecture but not yet eligible for activation. Keep it visible, but do not force it into sync until its compliant ingestion path exists.",
        },
        { status: 400 }
      );
    }

    if (!ACTIVE_PROVIDER_KEYS.has(providerKey)) {
      return NextResponse.json(
        { error: "Unsupported integration toggle target." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Saved integration toggle for ${providerKey}.`,
      persisted: false,
      note:
        "Toggle persistence is not yet backed by a dedicated workspace preferences model in the current schema. The control surface remains usable, but persistence should be added in a later schema update.",
      workspaceId,
      providerKey,
      enabled: Boolean(body.enabled),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update integration toggle." },
      { status: error?.status ?? 500 }
    );
  }
}