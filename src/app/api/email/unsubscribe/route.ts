import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";
import { unsubscribeToken } from "@/lib/email/weekly-digest";

/** One-click unsubscribe from the weekly email (signed link, no login needed). */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("e")?.trim().toLowerCase() ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!email || token !== unsubscribeToken(email)) {
    return new NextResponse("This unsubscribe link is invalid.", { status: 400 });
  }
  await ensureAdditiveSchema();
  await prisma.$executeRawUnsafe(`INSERT INTO email_optout (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, email);
  return new NextResponse("You're unsubscribed from the Anitrya weekly email.", { status: 200, headers: { "content-type": "text/plain" } });
}

export const POST = GET;
