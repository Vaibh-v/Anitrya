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
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}