import { NextResponse } from "next/server";
import { connectApiKeyProvider } from "@/lib/integrations/provider-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await connectApiKeyProvider({
      provider: body.provider,
      apiKey: body.apiKey,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const message = err?.message ?? "Failed to connect API-key provider.";
    const status =
      message.includes("preserved in architecture") ||
      message.includes("Unsupported provider") ||
      message.includes("Invalid API key")
        ? 400
        : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}
