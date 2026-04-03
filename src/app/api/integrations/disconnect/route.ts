import { NextResponse } from "next/server";
import { disconnectProvider } from "@/lib/integrations/provider-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await disconnectProvider(body.provider);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}